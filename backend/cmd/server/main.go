package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/chainproof/baas/internal/auth"
	"github.com/chainproof/baas/internal/blockchain"
	"github.com/chainproof/baas/internal/config"
	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/handlers"
	"github.com/chainproof/baas/internal/middleware"
	"github.com/chainproof/baas/internal/services"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	platformDB, err := database.NewPlatformDB(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("platform db: %v", err)
	}
	defer platformDB.Close()

	migrationsDir := filepath.Join("migrations", "platform")
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		migrationsDir = filepath.Join("backend", "migrations", "platform")
	}
	if err := platformDB.RunMigrations(ctx, migrationsDir); err != nil {
		log.Printf("migrations warning: %v", err)
	}

	tenantMigrations := filepath.Join("migrations", "tenant")
	if _, err := os.Stat(tenantMigrations); os.IsNotExist(err) {
		tenantMigrations = filepath.Join("backend", "migrations", "tenant")
	}

	jwtSvc := auth.NewJWTService(cfg.JWTSecret, cfg.JWTExpiryHours)
	authSvc := services.NewAuthService(platformDB, jwtSvc, cfg, tenantMigrations)
	if err := authSvc.SeedSuperAdmin(ctx); err != nil {
		log.Printf("seed admin warning: %v", err)
	}

	tenantResolver := tenant.NewResolver(platformDB, cfg)
	defer tenantResolver.Close()

	fabricClient := blockchain.NewClient(cfg.FabricGatewayURL, cfg.FabricGatewayKey, cfg.FabricDevMock)
	integritySvc := services.NewIntegrityService(tenantResolver, fabricClient)
	siteSvc := services.NewSiteService(tenantResolver)
	apiKeySvc := services.NewAPIKeyService(tenantResolver)
	teamSvc := services.NewTeamService(tenantResolver)
	notificationSvc := services.NewNotificationService(tenantResolver)
	attributionSvc := services.NewAttributionService(tenantResolver)
	platformSvc := services.NewPlatformService(platformDB)

	permSvc := services.NewPermissionService(tenantResolver)
	platformAnalytics := services.NewPlatformAnalytics(platformDB, tenantResolver)
	platformExtended := services.NewPlatformExtended(platformDB, tenantResolver, jwtSvc)

	authHandler := handlers.NewAuthHandler(authSvc, permSvc)
	integrityHandler := handlers.NewIntegrityHandler(integritySvc, siteSvc, platformDB, cfg.JWTSecret)
	siteHandler := handlers.NewSiteHandler(siteSvc, integritySvc, platformDB, cfg.JWTSecret)
	apiKeyHandler := handlers.NewAPIKeyHandler(apiKeySvc, platformDB)
	teamHandler := handlers.NewTeamHandler(teamSvc, platformDB)
	notificationHandler := handlers.NewNotificationHandler(notificationSvc, platformDB)
	attributionHandler := handlers.NewAttributionHandler(attributionSvc, platformDB)
	proxyHandler := handlers.NewProxyHandler(siteSvc, integritySvc, platformDB, cfg.JWTSecret)
	platformHandler := handlers.NewPlatformHandler(platformSvc, platformAnalytics, platformExtended)

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Org-Slug", "X-API-Key"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.RateLimit(120, time.Minute))

	r.GET("/health", platformHandler.Health)
	r.GET("/api/v1/plans", platformHandler.ListPlans)

	api := r.Group("/api/v1")
	{
		authRoutes := api.Group("")
		authRoutes.Use(middleware.RateLimit(20, time.Minute))
		authRoutes.POST("/auth/register", authHandler.Register)
		authRoutes.POST("/auth/login", authHandler.Login)

		protected := api.Group("")
		protected.Use(middleware.JWTAuth(jwtSvc))
		{
			protected.GET("/auth/me", authHandler.Me)
			protected.GET("/dashboard/stats", middleware.RequireTenantPermission(permSvc, "integrity:verify"), integrityHandler.DashboardStats)
			protected.GET("/dashboard/analytics", middleware.RequireTenantPermission(permSvc, "integrity:verify"), siteHandler.Analytics)

			protected.GET("/integrity/records", middleware.RequireTenantPermission(permSvc, "integrity:verify"), integrityHandler.ListRecords)
			protected.POST("/integrity/scan-tamper", middleware.RequireTenantPermission(permSvc, "tampering:investigate"), integrityHandler.ScanTamper)
			protected.GET("/tampering", middleware.RequireTenantPermission(permSvc, "tampering:read"), integrityHandler.ListIncidents)

			protected.GET("/sites", middleware.RequireTenantPermission(permSvc, "sites:read"), siteHandler.List)
			protected.POST("/sites", middleware.RequireTenantPermission(permSvc, "sites:write"), siteHandler.Create)
			protected.GET("/sites/:id", middleware.RequireTenantPermission(permSvc, "sites:read"), siteHandler.Get)
			protected.PUT("/sites/:id", middleware.RequireTenantPermission(permSvc, "sites:write"), siteHandler.Update)
			protected.DELETE("/sites/:id", middleware.RequireTenantPermission(permSvc, "sites:delete"), siteHandler.Delete)
			protected.POST("/sites/:id/discover", middleware.RequireTenantPermission(permSvc, "sites:write"), siteHandler.Discover)
			protected.POST("/sites/:id/force-integrity", middleware.RequireTenantPermission(permSvc, "endpoints:write"), siteHandler.ForceIntegrity)
			protected.GET("/sites/:id/export-endpoints", middleware.RequireTenantPermission(permSvc, "endpoints:read"), siteHandler.ExportEndpoints)
			protected.GET("/sites/:id/endpoints", middleware.RequireTenantPermission(permSvc, "endpoints:read"), siteHandler.ListEndpoints)
			protected.POST("/sites/:id/endpoints", middleware.RequireTenantPermission(permSvc, "endpoints:write"), siteHandler.AddEndpoint)
			protected.PATCH("/sites/:id/endpoints/:epId", middleware.RequireTenantPermission(permSvc, "endpoints:write"), siteHandler.ToggleEndpoint)
			protected.DELETE("/sites/:id/endpoints/:epId", middleware.RequireTenantPermission(permSvc, "endpoints:write"), siteHandler.DeleteEndpoint)
			protected.GET("/sites/:id/auth", middleware.RequireTenantPermission(permSvc, "sites:read"), siteHandler.GetAuth)
			protected.PUT("/sites/:id/auth", middleware.RequireTenantPermission(permSvc, "sites:write"), siteHandler.UpdateAuth)
			protected.POST("/sites/:id/test-endpoint", middleware.RequireTenantPermission(permSvc, "endpoints:write"), siteHandler.TestEndpoint)
			protected.GET("/sites/:id/captures", middleware.RequireTenantPermission(permSvc, "endpoints:read"), siteHandler.ListCaptures)
			protected.Any("/proxy/:id/*path", middleware.RequireTenantPermission(permSvc, "endpoints:read"), proxyHandler.Forward)

			protected.GET("/api-keys", middleware.RequireTenantPermission(permSvc, "api_keys:read"), apiKeyHandler.List)
			protected.POST("/api-keys", middleware.RequireTenantPermission(permSvc, "api_keys:write"), apiKeyHandler.Create)
			protected.DELETE("/api-keys/:id", middleware.RequireTenantPermission(permSvc, "api_keys:write"), apiKeyHandler.Revoke)

			protected.GET("/team/users", middleware.RequireTenantPermission(permSvc, "team:read"), teamHandler.ListUsers)
			protected.POST("/team/users", middleware.RequireTenantPermission(permSvc, "team:write"), teamHandler.CreateUser)
			protected.PATCH("/team/users/:id", middleware.RequireTenantPermission(permSvc, "team:write"), teamHandler.UpdateUser)
			protected.GET("/team/roles", middleware.RequireTenantPermission(permSvc, "team:read"), teamHandler.ListRoles)
			protected.GET("/team/permissions", middleware.RequireTenantPermission(permSvc, "team:read"), teamHandler.ListPermissions)
			protected.GET("/team/roles/:role/permissions", middleware.RequireTenantPermission(permSvc, "team:read"), teamHandler.GetRolePermissions)
			protected.PUT("/team/roles/:role/permissions", middleware.RequireTenantPermission(permSvc, "team:write"), teamHandler.UpdateRolePermissions)

			protected.GET("/notifications/channels", middleware.RequireTenantPermission(permSvc, "notifications:read"), notificationHandler.List)
			protected.POST("/notifications/channels", middleware.RequireTenantPermission(permSvc, "notifications:write"), notificationHandler.Upsert)
			protected.DELETE("/notifications/channels/:id", middleware.RequireTenantPermission(permSvc, "notifications:write"), notificationHandler.Delete)

			protected.POST("/tampering/:id/investigate", middleware.RequireTenantPermission(permSvc, "tampering:investigate"), attributionHandler.Investigate)

			admin := protected.Group("/platform")
			admin.Use(middleware.RequireRole("super_admin"))
			{
				admin.GET("/overview", platformHandler.Overview)
				admin.GET("/organizations", platformHandler.ListOrganizations)
				admin.PATCH("/organizations/:id", platformHandler.UpdateOrganization)
				admin.GET("/users", platformHandler.ListUsers)
				admin.POST("/users/:userId/impersonate", platformHandler.Impersonate)
				admin.GET("/audit-logs", platformHandler.ListAuditLogs)
				admin.GET("/plans", platformHandler.ListPlansAdmin)
				admin.PATCH("/plans/:id", platformHandler.UpdatePlanAdmin)
				admin.GET("/billing", platformHandler.BillingOverview)
				admin.GET("/reports/usage", platformHandler.UsageReport)
				admin.GET("/settings/:key", platformHandler.GetSettings)
				admin.PUT("/settings/:key", platformHandler.UpdateSettings)
				admin.GET("/scanner", platformHandler.ScannerStatus)
				admin.GET("/wordlists", platformHandler.ListWordlists)
				admin.POST("/wordlists", platformHandler.UploadWordlist)
				admin.GET("/sites", platformHandler.ListAllSites)
				admin.GET("/incidents", platformHandler.ListPlatformIncidents)
			}
		}

		// Programmatic integrity API — JWT or long-lived API key (cp_...)
		integrityAPI := api.Group("")
		integrityAPI.Use(middleware.JWTOrAPIKeyAuth(jwtSvc, apiKeySvc, platformDB))
		{
			integrityAPI.POST("/integrity/anchor",
				middleware.RequireAPIScope("integrity:anchor"),
				integrityHandler.Anchor)
			integrityAPI.POST("/integrity/verify",
				middleware.RequireAPIScope("integrity:verify"),
				integrityHandler.Verify)
		}
	}

	go runMonitor(integritySvc, siteSvc, tenantResolver, platformDB, cfg.JWTSecret)

	log.Printf("ChainProof API starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

func runMonitor(integrity *services.IntegrityService, sites *services.SiteService, resolver *tenant.Resolver, platform *database.PlatformDB, secret string) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		ctx := context.Background()
		rows, err := platform.Pool.Query(ctx, `SELECT slug FROM organizations WHERE active = true`)
		if err != nil {
			continue
		}
		for rows.Next() {
			var slug string
			if err := rows.Scan(&slug); err != nil {
				continue
			}
			if n, err := integrity.RunMonitor(ctx, slug); err == nil && n > 0 {
				log.Printf("monitor: %d tamper alerts for org %s", n, slug)
			}
			if n, err := integrity.RetryFailedAnchors(ctx, slug); err == nil && n > 0 {
				log.Printf("retry: re-anchored %d failed records for org %s", n, slug)
			}
			if stats, err := sites.PollProtectedEndpoints(ctx, slug, secret, integrity); err == nil {
				if stats.Anchored > 0 {
					log.Printf("poll: anchored %d static endpoint responses for org %s", stats.Anchored, slug)
				}
				if stats.Verified > 0 {
					log.Printf("poll: verified %d static endpoints for org %s", stats.Verified, slug)
				}
				if stats.Tampered > 0 {
					log.Printf("poll: TAMPERING on %d static endpoints for org %s", stats.Tampered, slug)
				}
			}
			if vStats, err := integrity.VerifyAnchoredRecords(ctx, slug, sites, secret, 200); err == nil {
				if vStats.Verified > 0 {
					log.Printf("verify: checked %d anchored records for org %s", vStats.Verified, slug)
				}
				if vStats.Tampered > 0 {
					log.Printf("verify: TAMPERING on %d anchored records for org %s", vStats.Tampered, slug)
				}
			}
		}
		rows.Close()
	}
}
