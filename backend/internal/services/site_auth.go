package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/chainproof/baas/internal/crypto"
	"github.com/google/uuid"
)

type SiteAuthSettings struct {
	AuthType            string            `json:"auth_type"` // none, bearer, api_key, basic
	BearerToken         string            `json:"bearer_token,omitempty"`
	APIKeyHeader        string            `json:"api_key_header,omitempty"`
	APIKeyValue         string            `json:"api_key_value,omitempty"`
	BasicUser           string            `json:"basic_user,omitempty"`
	BasicPass           string            `json:"basic_pass,omitempty"`
	CustomHeaders       map[string]string `json:"custom_headers,omitempty"`
	SampleBodies        map[string]string `json:"sample_bodies,omitempty"`
	PollEnabled         bool              `json:"poll_enabled"`
	PollIntervalMinutes int               `json:"poll_interval_minutes"`
}

type SiteAuthPublic struct {
	AuthType            string            `json:"auth_type"`
	BearerTokenSet      bool              `json:"bearer_token_set"`
	BearerTokenPreview  string            `json:"bearer_token_preview,omitempty"`
	APIKeyHeader        string            `json:"api_key_header,omitempty"`
	APIKeyValueSet      bool              `json:"api_key_value_set"`
	APIKeyValuePreview  string            `json:"api_key_value_preview,omitempty"`
	BasicUser           string            `json:"basic_user,omitempty"`
	BasicPassSet        bool              `json:"basic_pass_set"`
	CustomHeaders       map[string]string `json:"custom_headers,omitempty"`
	SampleBodies        map[string]string `json:"sample_bodies,omitempty"`
	PollEnabled         bool              `json:"poll_enabled"`
	PollIntervalMinutes int               `json:"poll_interval_minutes"`
}

func (s *SiteService) loadSiteSettings(ctx context.Context, orgSlug string, siteID uuid.UUID) (map[string]interface{}, string, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, "", err
	}
	var settingsJSON []byte
	var baseURL string
	err = pool.QueryRow(ctx, `SELECT settings, base_url FROM sites WHERE id = $1`, siteID).Scan(&settingsJSON, &baseURL)
	if err != nil {
		return nil, "", fmt.Errorf("site not found")
	}
	settings := map[string]interface{}{}
	if len(settingsJSON) > 0 {
		_ = json.Unmarshal(settingsJSON, &settings)
	}
	return settings, baseURL, nil
}

func (s *SiteService) GetAuthSettings(ctx context.Context, orgSlug string, siteID uuid.UUID, secret string) (*SiteAuthPublic, error) {
	settings, _, err := s.loadSiteSettings(ctx, orgSlug, siteID)
	if err != nil {
		return nil, err
	}
	auth := parseAuthFromSettings(settings, secret)
	return toPublicAuth(auth), nil
}

func (s *SiteService) UpdateAuthSettings(ctx context.Context, orgSlug string, siteID uuid.UUID, secret string, req SiteAuthSettings) (*SiteAuthPublic, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	settings, _, err := s.loadSiteSettings(ctx, orgSlug, siteID)
	if err != nil {
		return nil, err
	}
	current := parseAuthFromSettings(settings, secret)

	if req.AuthType != "" {
		current.AuthType = req.AuthType
	}
	if req.BearerToken != "" && !strings.HasPrefix(req.BearerToken, "****") {
		enc, _ := crypto.Encrypt(secret, req.BearerToken)
		settings["auth_bearer"] = enc
		current.BearerToken = req.BearerToken
	}
	if req.APIKeyHeader != "" {
		current.APIKeyHeader = req.APIKeyHeader
		settings["auth_api_key_header"] = req.APIKeyHeader
	}
	if req.APIKeyValue != "" && !strings.HasPrefix(req.APIKeyValue, "****") {
		enc, _ := crypto.Encrypt(secret, req.APIKeyValue)
		settings["auth_api_key_value"] = enc
		current.APIKeyValue = req.APIKeyValue
	}
	if req.BasicUser != "" {
		current.BasicUser = req.BasicUser
		settings["auth_basic_user"] = req.BasicUser
	}
	if req.BasicPass != "" && !strings.HasPrefix(req.BasicPass, "****") {
		enc, _ := crypto.Encrypt(secret, req.BasicPass)
		settings["auth_basic_pass"] = enc
		current.BasicPass = req.BasicPass
	}
	if req.CustomHeaders != nil {
		current.CustomHeaders = req.CustomHeaders
		settings["auth_custom_headers"] = req.CustomHeaders
	}
	if req.SampleBodies != nil {
		current.SampleBodies = req.SampleBodies
		settings["auth_sample_bodies"] = req.SampleBodies
	}
	current.PollEnabled = req.PollEnabled
	current.PollIntervalMinutes = req.PollIntervalMinutes
	if current.PollIntervalMinutes <= 0 {
		current.PollIntervalMinutes = 5
	}
	settings["auth_type"] = current.AuthType
	settings["poll_enabled"] = current.PollEnabled
	settings["poll_interval_minutes"] = current.PollIntervalMinutes

	b, _ := json.Marshal(settings)
	_, err = pool.Exec(ctx, `UPDATE sites SET settings = $1, updated_at = NOW() WHERE id = $2`, b, siteID)
	if err != nil {
		return nil, err
	}
	return toPublicAuth(current), nil
}

func parseAuthFromSettings(settings map[string]interface{}, secret string) SiteAuthSettings {
	auth := SiteAuthSettings{
		AuthType:            strVal(settings["auth_type"], "none"),
		APIKeyHeader:        strVal(settings["auth_api_key_header"], "X-API-Key"),
		PollEnabled:         boolVal(settings["poll_enabled"]),
		PollIntervalMinutes: intVal(settings["poll_interval_minutes"], 5),
		CustomHeaders:       mapStr(settings["auth_custom_headers"]),
		SampleBodies:        mapStr(settings["auth_sample_bodies"]),
	}
	if enc := strVal(settings["auth_bearer"], ""); enc != "" {
		if v, err := crypto.Decrypt(secret, enc); err == nil {
			auth.BearerToken = v
		}
	}
	if enc := strVal(settings["auth_api_key_value"], ""); enc != "" {
		if v, err := crypto.Decrypt(secret, enc); err == nil {
			auth.APIKeyValue = v
		}
	}
	auth.BasicUser = strVal(settings["auth_basic_user"], "")
	if enc := strVal(settings["auth_basic_pass"], ""); enc != "" {
		if v, err := crypto.Decrypt(secret, enc); err == nil {
			auth.BasicPass = v
		}
	}
	return auth
}

func toPublicAuth(a SiteAuthSettings) *SiteAuthPublic {
	return &SiteAuthPublic{
		AuthType:            a.AuthType,
		BearerTokenSet:      a.BearerToken != "",
		BearerTokenPreview:  crypto.MaskSecret(a.BearerToken),
		APIKeyHeader:        a.APIKeyHeader,
		APIKeyValueSet:      a.APIKeyValue != "",
		APIKeyValuePreview:  crypto.MaskSecret(a.APIKeyValue),
		BasicUser:           a.BasicUser,
		BasicPassSet:        a.BasicPass != "",
		CustomHeaders:       a.CustomHeaders,
		SampleBodies:        a.SampleBodies,
		PollEnabled:         a.PollEnabled,
		PollIntervalMinutes: a.PollIntervalMinutes,
	}
}

func (s *SiteService) ApplyAuthHeaders(req *http.Request, auth SiteAuthSettings) {
	switch auth.AuthType {
	case "bearer":
		if auth.BearerToken != "" {
			req.Header.Set("Authorization", "Bearer "+auth.BearerToken)
		}
	case "api_key":
		if auth.APIKeyHeader == "" {
			auth.APIKeyHeader = "X-API-Key"
		}
		if auth.APIKeyValue != "" {
			req.Header.Set(auth.APIKeyHeader, auth.APIKeyValue)
		}
	case "basic":
		if auth.BasicUser != "" {
			req.SetBasicAuth(auth.BasicUser, auth.BasicPass)
		}
	}
	for k, v := range auth.CustomHeaders {
		req.Header.Set(k, v)
	}
}

func strVal(v interface{}, def string) string {
	if s, ok := v.(string); ok {
		return s
	}
	return def
}

func boolVal(v interface{}) bool {
	if b, ok := v.(bool); ok {
		return b
	}
	return false
}

func intVal(v interface{}, def int) int {
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	default:
		return def
	}
}

func mapStr(v interface{}) map[string]string {
	out := map[string]string{}
	if m, ok := v.(map[string]interface{}); ok {
		for k, val := range m {
			if s, ok := val.(string); ok {
				out[k] = s
			}
		}
	}
	return out
}

func (s *SiteService) GetSiteAuth(ctx context.Context, orgSlug string, siteID uuid.UUID, secret string) (SiteAuthSettings, error) {
	settings, _, err := s.loadSiteSettings(ctx, orgSlug, siteID)
	if err != nil {
		return SiteAuthSettings{}, err
	}
	return parseAuthFromSettings(settings, secret), nil
}

type EndpointTestResult struct {
	StatusCode int    `json:"status_code"`
	Body       string `json:"body_preview"`
	Anchored   bool   `json:"anchored"`
	EntityID   string `json:"entity_id,omitempty"`
	Message    string `json:"message,omitempty"`
}

func (s *SiteService) TestEndpoint(ctx context.Context, orgSlug, secret string, siteID uuid.UUID, method, path, body string, anchor bool, integrity *IntegrityService) (*EndpointTestResult, error) {
	settings, baseURL, err := s.loadSiteSettings(ctx, orgSlug, siteID)
	if err != nil {
		return nil, err
	}
	auth := parseAuthFromSettings(settings, secret)
	status, respBody, err := s.callEndpoint(ctx, baseURL, auth, method, path, body)
	if err != nil {
		return &EndpointTestResult{Message: err.Error()}, nil
	}
	result := &EndpointTestResult{
		StatusCode: status,
		Body:       truncate(respBody, 512),
	}
	if anchor && status >= 200 && status < 500 {
		entityID, err := s.anchorPayload(ctx, orgSlug, siteID, method, path, body, respBody, integrity)
		if err == nil {
			result.Anchored = true
			result.EntityID = entityID
			result.Message = "Record anchored successfully"
		} else {
			result.Message = err.Error()
		}
	}
	return result, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
