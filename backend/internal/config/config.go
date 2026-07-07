package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	Env               string
	DatabaseURL       string
	TenantDBHost      string
	TenantDBPort      string
	TenantDBUser      string
	TenantDBPassword  string
	JWTSecret         string
	JWTExpiryHours    int
	FabricGatewayURL  string
	FabricGatewayKey  string
	FabricDevMock     bool
	SeedAdminEmail    string
	SeedAdminPassword string
	CORSOrigins       []string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	expiry := 24
	if v := os.Getenv("JWT_EXPIRY_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			expiry = n
		}
	}

	origins := []string{"http://localhost:4200", "http://127.0.0.1:4200"}
	if v := os.Getenv("CORS_ORIGINS"); v != "" {
		origins = nil
		for _, o := range strings.Split(v, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins = append(origins, o)
			}
		}
	}

	return &Config{
		Port:              getEnv("PORT", "8080"),
		Env:               getEnv("ENV", "development"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://postgres:admin123@localhost:5434/chainproof_platform?sslmode=disable"),
		TenantDBHost:      getEnv("TENANT_DB_HOST", "localhost"),
		TenantDBPort:      getEnv("TENANT_DB_PORT", "5434"),
		TenantDBUser:      getEnv("TENANT_DB_USER", "postgres"),
		TenantDBPassword:  getEnv("TENANT_DB_PASSWORD", "admin123"),
		JWTSecret:         getEnv("JWT_SECRET", "chainproof-dev-secret"),
		JWTExpiryHours:    expiry,
		FabricGatewayURL:  getEnv("FABRIC_GATEWAY_URL", "http://localhost:8090"),
		FabricGatewayKey:  getEnv("FABRIC_GATEWAY_API_KEY", "chainproof-dev-key"),
		FabricDevMock:     getEnv("FABRIC_DEV_MOCK", "true") == "true",
		SeedAdminEmail:    getEnv("SEED_ADMIN_EMAIL", "admin@chainproof.io"),
		SeedAdminPassword: getEnv("SEED_ADMIN_PASSWORD", "ChainProof2026!"),
		CORSOrigins:       origins,
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
