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

	fabricClient := blockchain.NewClient(cfg.FabricGatewayURL, cfg.FabricGatewayKey)
	integritySvc := services.NewIntegrityService(tenantResolver, fabricClient)
	siteSvc := services.NewSiteService(tenantResolver)
	apiKeySvc := services.NewAPIKeyService(tenantResolver)
	teamSvc := services.NewTeamService(tenantResolver)
	notificationSvc := services.NewNotificationService(tenantResolver)
	attributionSvc := services.NewAttributionService(tenantResolver)
	platformSvc := services.NewPlatformService(platformDB)

	authHandler := handlers.NewAuthHandler(authSvc)
	integrityHandler := handlers.NewIntegrityHandler(integritySvc, platformDB)
	siteHandler := handlers.NewSiteHandler(siteSvc, platformDB)
	apiKeyHandler := handlers.NewAPIKeyHandler(apiKeySvc, platformDB)
	teamHandler := handlers.NewTeamHandler(teamSvc, platformDB)
	notificationHandler := handlers.NewNotificationHandler(notificationSvc, platformDB)
	attributionHandler := handlers.NewAttributionHandler(attributionSvc, platformDB)
	proxyHandler := handlers.NewProxyHandler(siteSvc, platformDB)
	platformHandler := handlers.NewPlatformHandler(platformSvc)

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Org-Slug", "X-API-Key"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
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
			protected.GET("/dashboard/stats", integrityHandler.DashboardStats)

			protected.POST("/integrity/anchor", integrityHandler.Anchor)
			protected.POST("/integrity/verify", integrityHandler.Verify)
			protected.GET("/integrity/records", integrityHandler.ListRecords)
			protected.GET("/tampering", integrityHandler.ListIncidents)

			protected.GET("/sites", siteHandler.List)
			protected.POST("/sites", siteHandler.Create)
			protected.GET("/sites/:id", siteHandler.Get)
			protected.PUT("/sites/:id", siteHandler.Update)
			protected.DELETE("/sites/:id", siteHandler.Delete)
			protected.POST("/sites/:id/discover", siteHandler.Discover)
			protected.GET("/sites/:id/endpoints", siteHandler.ListEndpoints)
			protected.POST("/sites/:id/endpoints", siteHandler.AddEndpoint)
			protected.PATCH("/sites/:id/endpoints/:epId", siteHandler.ToggleEndpoint)
			protected.DELETE("/sites/:id/endpoints/:epId", siteHandler.DeleteEndpoint)
			protected.Any("/proxy/:id/*path", proxyHandler.Forward)

			protected.GET("/api-keys", apiKeyHandler.List)
			protected.POST("/api-keys", apiKeyHandler.Create)
			protected.DELETE("/api-keys/:id", apiKeyHandler.Revoke)

			protected.GET("/team/users", teamHandler.ListUsers)
			protected.POST("/team/users", teamHandler.CreateUser)
			protected.PATCH("/team/users/:id", teamHandler.UpdateUser)
			protected.GET("/team/roles", teamHandler.ListRoles)

			protected.GET("/notifications/channels", notificationHandler.List)
			protected.POST("/notifications/channels", notificationHandler.Upsert)
			protected.DELETE("/notifications/channels/:id", notificationHandler.Delete)

			protected.POST("/tampering/:id/investigate", attributionHandler.Investigate)

			admin := protected.Group("/platform")
			admin.Use(middleware.RequireRole("super_admin"))
			{
				admin.GET("/overview", platformHandler.Overview)
				admin.GET("/organizations", platformHandler.ListOrganizations)
			}
		}
	}

	go runMonitor(integritySvc, tenantResolver, platformDB)

	log.Printf("ChainProof API starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

func runMonitor(integrity *services.IntegrityService, resolver *tenant.Resolver, platform *database.PlatformDB) {
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
		}
		rows.Close()
	}
}
