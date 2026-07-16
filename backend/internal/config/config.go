package config

import (
	"os"
	"strconv"
	"strings"
	"fmt"

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
	FabricChannel     string
	FabricChaincode   string
	SeedAdminEmail    string
	SeedAdminPassword string
	CORSOrigins       []string
	AppURL            string
	MailHost          string
	MailPort          int
	MailUsername      string
	MailPassword      string
	MailFrom          string
	MailEncryption    string
	MailMailer        string
	MailTLSServerName string
	StripeSecretKey   string
	StripeWebhookKey  string
}

func Load() (*Config, error) {
	_ = godotenv.Load()
	_ = godotenv.Load("backend/.env")

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

	mailPort := 587
	if v := os.Getenv("MAIL_PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			mailPort = n
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
		FabricChannel:     getEnv("FABRIC_CHANNEL", "chainproof-channel"),
		FabricChaincode:   getEnv("FABRIC_CHAINCODE", "chainproof-integrity"),
		SeedAdminEmail:    getEnv("SEED_ADMIN_EMAIL", "admin@chainproof.io"),
		SeedAdminPassword: getEnv("SEED_ADMIN_PASSWORD", "ChainProof2026!"),
		CORSOrigins:       origins,
		AppURL:            getEnv("APP_URL", "http://localhost:4200"),
		MailHost:          getEnv("MAIL_HOST", ""),
		MailPort:          mailPort,
		MailUsername:      getEnv("MAIL_USERNAME", ""),
		MailPassword:      getEnv("MAIL_PASSWORD", ""),
		MailFrom:          firstNonEmpty(getEnv("MAIL_FROM", ""), formatFrom(getEnv("MAIL_FROM_NAME", ""), getEnv("MAIL_FROM_ADDRESS", "")), getEnv("MAIL_USERNAME", "")),
		MailEncryption:    getEnv("MAIL_ENCRYPTION", "tls"),
		MailMailer:        getEnv("MAIL_MAILER", "smtp"),
		MailTLSServerName: getEnv("MAIL_TLS_SERVER_NAME", ""),
		StripeSecretKey:   getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookKey:  getEnv("STRIPE_WEBHOOK_SECRET", ""),
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func formatFrom(name, address string) string {
	name = strings.TrimSpace(name)
	address = strings.TrimSpace(address)
	if name != "" && address != "" {
		return fmt.Sprintf("%s <%s>", name, address)
	}
	return address
}
