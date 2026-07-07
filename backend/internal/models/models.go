package models

import (
	"time"

	"github.com/google/uuid"
)

type Plan struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	Slug              string    `json:"slug"`
	PriceMonthly      float64   `json:"price_monthly"`
	MaxSites          int       `json:"max_sites"`
	MaxEndpoints      int       `json:"max_endpoints"`
	MaxAnchorsMonthly int       `json:"max_anchors_monthly"`
	Features          []string  `json:"features"`
}

type PlanUpdateRequest struct {
	Name              *string  `json:"name,omitempty"`
	PriceMonthly      *float64 `json:"price_monthly,omitempty"`
	MaxSites          *int     `json:"max_sites,omitempty"`
	MaxEndpoints      *int     `json:"max_endpoints,omitempty"`
	MaxAnchorsMonthly *int     `json:"max_anchors_monthly,omitempty"`
}

type Organization struct {
	ID                 uuid.UUID `json:"id"`
	Name               string    `json:"name"`
	Slug               string    `json:"slug"`
	DBName             string    `json:"-"`
	PlanID             uuid.UUID `json:"plan_id"`
	PlanSlug           string    `json:"plan_slug,omitempty"`
	SubscriptionStatus string    `json:"subscription_status"`
	PaymentStatus      string    `json:"payment_status"`
	Active             bool      `json:"active"`
	CreatedAt          time.Time `json:"created_at"`
}

type PlatformUser struct {
	ID             uuid.UUID  `json:"id"`
	Email          string     `json:"email"`
	FullName       string     `json:"full_name"`
	Role           string     `json:"role"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	OrgName        string     `json:"org_name,omitempty"`
	OrgSlug        string     `json:"org_slug,omitempty"`
	EmailVerified  bool       `json:"email_verified"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name" binding:"required"`
	OrgName  string `json:"org_name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token        string        `json:"token"`
	ExpiresAt    time.Time     `json:"expires_at"`
	User         PlatformUser  `json:"user"`
	Organization *Organization `json:"organization,omitempty"`
}

type Site struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	BaseURL         string    `json:"base_url"`
	IntegrationMode string    `json:"integration_mode"`
	Status          string    `json:"status"`
	DBType          *string   `json:"db_type,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type SiteUpsertRequest struct {
	Name            string  `json:"name" binding:"required"`
	BaseURL         string  `json:"base_url" binding:"required,url"`
	IntegrationMode string  `json:"integration_mode"`
	DBType          *string `json:"db_type,omitempty"`
}

type ProtectedEndpoint struct {
	ID             uuid.UUID `json:"id"`
	SiteID         uuid.UUID `json:"site_id"`
	Method         string    `json:"method"`
	PathPattern    string    `json:"path_pattern"`
	TableName      *string   `json:"table_name,omitempty"`
	RecordIDField  string    `json:"record_id_field"`
	Enabled        bool      `json:"enabled"`
	AutoDiscovered bool      `json:"auto_discovered"`
}

type IntegrityRecord struct {
	ID                 uuid.UUID  `json:"id"`
	SiteID             *uuid.UUID `json:"site_id,omitempty"`
	EntityType         string     `json:"entity_type"`
	EntityID           string     `json:"entity_id"`
	TableName          *string    `json:"table_name,omitempty"`
	PayloadHash        string     `json:"payload_hash"`
	RecordHash         string     `json:"record_hash"`
	PreviousRecordHash *string    `json:"previous_record_hash,omitempty"`
	BlockchainTxID     *string    `json:"blockchain_tx_id,omitempty"`
	BlockchainStatus   string     `json:"blockchain_status"`
	AnchoredAt         *time.Time `json:"anchored_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
}

type TamperIncident struct {
	ID                  uuid.UUID              `json:"id"`
	IntegrityRecordID   *uuid.UUID             `json:"integrity_record_id,omitempty"`
	SiteID              *uuid.UUID             `json:"site_id,omitempty"`
	EntityType          string                 `json:"entity_type"`
	EntityID            string                 `json:"entity_id"`
	TableName           *string                `json:"table_name,omitempty"`
	Severity            string                 `json:"severity"`
	ExpectedHash        string                 `json:"expected_hash"`
	ActualHash          *string                `json:"actual_hash,omitempty"`
	BlockchainTxID      *string                `json:"blockchain_tx_id,omitempty"`
	DetectedAt          time.Time              `json:"detected_at"`
	InvestigationStatus string                 `json:"investigation_status"`
	Attribution         map[string]interface{} `json:"attribution,omitempty"`
}

// VerifyConfig tells ChainProof how to re-fetch live data for tamper detection.
// Set once per anchor call — no per-session dashboard config required.
type VerifyConfig struct {
	Method       string            `json:"method"`
	PathTemplate string            `json:"path_template"`
	PathParams   map[string]string `json:"path_params,omitempty"`
	RequestBody  string            `json:"request_body,omitempty"`
	// PayloadFrom: "response" (default) hashes the JSON response body;
	// "http" hashes {request, response} like endpoint polling.
	PayloadFrom string `json:"payload_from,omitempty"`
}

type AnchorRequest struct {
	EntityType         string                 `json:"entity_type" binding:"required"`
	EntityID           string                 `json:"entity_id" binding:"required"`
	Payload            map[string]interface{} `json:"payload" binding:"required"`
	TableName          string                 `json:"table_name,omitempty"`
	PreviousRecordHash string                 `json:"previous_record_hash,omitempty"`
	SiteID             string                 `json:"site_id,omitempty"`
	Verify             *VerifyConfig          `json:"verify,omitempty"`
}

type VerifyRequest struct {
	EntityType string                 `json:"entity_type" binding:"required"`
	EntityID   string                 `json:"entity_id" binding:"required"`
	Payload    map[string]interface{} `json:"payload" binding:"required"`
}

type VerifyResponse struct {
	Intact       bool    `json:"intact"`
	HasAnchor    bool    `json:"has_anchor"`
	ExpectedHash string  `json:"expected_hash"`
	ActualHash   string  `json:"actual_hash"`
	TxID         *string `json:"tx_id,omitempty"`
	Message      string  `json:"message"`
}

type DashboardStats struct {
	TotalSites         int `json:"total_sites"`
	ProtectedEndpoints int `json:"protected_endpoints"`
	AnchoredRecords    int `json:"anchored_records"`
	OpenIncidents      int `json:"open_incidents"`
	TamperedRecords    int `json:"tampered_records"`
}

type APIKey struct {
	ID         uuid.UUID  `json:"id"`
	Name       string     `json:"name"`
	KeyPrefix  string     `json:"key_prefix"`
	Scopes     []string   `json:"scopes"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	Active     bool       `json:"active"`
	CreatedAt  time.Time  `json:"created_at"`
	PlainKey   string     `json:"plain_key,omitempty"`
}

type Role struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsSystem    bool      `json:"is_system"`
}

type TenantUser struct {
	ID       uuid.UUID `json:"id"`
	Email    string    `json:"email"`
	FullName string    `json:"full_name"`
	Roles    []string  `json:"roles"`
	Active   bool      `json:"active"`
}

type TeamUserCreateRequest struct {
	Email    string   `json:"email" binding:"required,email"`
	FullName string   `json:"full_name" binding:"required"`
	Password string   `json:"password" binding:"required,min=8"`
	Roles    []string `json:"roles"`
}

type TeamUserUpdateRequest struct {
	FullName *string   `json:"full_name,omitempty"`
	Active   *bool     `json:"active,omitempty"`
	Roles    *[]string `json:"roles,omitempty"`
}

type NotificationChannel struct {
	ID          uuid.UUID              `json:"id"`
	Name        string                 `json:"name"`
	ChannelType string                 `json:"channel_type"`
	Config      map[string]interface{} `json:"config"`
	Events      []string               `json:"events"`
	Active      bool                   `json:"active"`
	CreatedAt   time.Time              `json:"created_at"`
}

type DiscoveredEndpoint struct {
	Method   string   `json:"method"`
	Path     string   `json:"path"`
	Status   int      `json:"status,omitempty"`
	Source   string   `json:"source,omitempty"`
	Sources  []string `json:"sources,omitempty"`
	Priority int      `json:"priority,omitempty"`
}

type DiscoverResult struct {
	Discovered  []DiscoveredEndpoint `json:"discovered"`
	Suggestions []DiscoveredEndpoint `json:"suggestions,omitempty"`
}

type ProxyCaptureLog struct {
	ID           uuid.UUID `json:"id"`
	SiteID       uuid.UUID `json:"site_id"`
	Method       string    `json:"method"`
	Path         string    `json:"path"`
	StatusCode   int       `json:"status_code"`
	RequestBody  string    `json:"request_body,omitempty"`
	ResponseBody string    `json:"response_body,omitempty"`
	CapturedAt   time.Time `json:"captured_at"`
}
