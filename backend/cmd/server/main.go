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
	platformSvc := services.NewPlatformService(platformDB)

	authHandler := handlers.NewAuthHandler(authSvc)
	integrityHandler := handlers.NewIntegrityHandler(integritySvc)
	siteHandler := handlers.NewSiteHandler(siteSvc)
	apiKeyHandler := handlers.NewAPIKeyHandler(apiKeySvc)
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

	r.GET("/health", platformHandler.Health)
	r.GET("/api/v1/plans", platformHandler.ListPlans)

	api := r.Group("/api/v1")
	{
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)

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
			protected.POST("/sites/:id/discover", siteHandler.Discover)
			protected.GET("/sites/:id/endpoints", siteHandler.ListEndpoints)
			protected.PATCH("/sites/:id/endpoints/:epId", siteHandler.ToggleEndpoint)

			protected.GET("/api-keys", apiKeyHandler.List)
			protected.POST("/api-keys", apiKeyHandler.Create)
			protected.DELETE("/api-keys/:id", apiKeyHandler.Revoke)

			admin := protected.Group("/platform")
			admin.Use(middleware.RequireRole("super_admin"))
			{
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
