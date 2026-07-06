package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/chainproof/baas/internal/models"
	"github.com/google/uuid"
)

func discoveryPriority(sources []string) int {
	weights := map[string]int{
		"openapi":    100,
		"javascript": 80,
		"html":       60,
		"robots":     50,
		"wordlist":   10,
	}
	score := 0
	hasNonWordlist := false
	for _, src := range sources {
		score += weights[src]
		if src != "wordlist" {
			hasNonWordlist = true
		}
	}
	if len(sources) > 1 {
		score += 50 * (len(sources) - 1)
	}
	if hasNonWordlist && containsSource(sources, "wordlist") {
		score += 40
	}
	return score
}

func containsSource(sources []string, target string) bool {
	for _, s := range sources {
		if s == target {
			return true
		}
	}
	return false
}

func sortDiscovered(in []models.DiscoveredEndpoint) {
	sort.Slice(in, func(i, j int) bool {
		if in[i].Priority != in[j].Priority {
			return in[i].Priority > in[j].Priority
		}
		if in[i].Path != in[j].Path {
			return in[i].Path < in[j].Path
		}
		return in[i].Method < in[j].Method
	})
}

func addDiscoverySource(candidates map[string][]string, path, source string) {
	if shouldSkipPath(path) {
		return
	}
	for _, s := range candidates[path] {
		if s == source {
			return
		}
	}
	candidates[path] = append(candidates[path], source)
}

func primarySource(sources []string) string {
	order := []string{"openapi", "javascript", "html", "robots", "wordlist"}
	for _, want := range order {
		for _, s := range sources {
			if s == want {
				return s
			}
		}
	}
	if len(sources) > 0 {
		return sources[0]
	}
	return "unknown"
}

func (s *SiteService) collectDiscoveryCandidates(ctx context.Context, base *url.URL) map[string][]string {
	candidates := map[string][]string{}

	for _, p := range apiWordlist {
		addDiscoverySource(candidates, p, "wordlist")
	}
	for _, p := range s.discoverFromHTML(ctx, base) {
		addDiscoverySource(candidates, p, "html")
	}
	for _, p := range s.discoverFromRobots(ctx, base) {
		addDiscoverySource(candidates, p, "robots")
	}
	for _, p := range s.discoverFromOpenAPI(ctx, base) {
		addDiscoverySource(candidates, p, "openapi")
	}
	for _, p := range s.discoverFromJSBundles(ctx, base) {
		addDiscoverySource(candidates, p, "javascript")
	}
	return candidates
}

func (s *SiteService) callEndpoint(ctx context.Context, baseURL string, auth SiteAuthSettings, method, path, body string) (int, string, error) {
	url := strings.TrimRight(baseURL, "/") + path
	var bodyReader io.Reader
	if body != "" {
		bodyReader = strings.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, strings.ToUpper(method), url, bodyReader)
	if err != nil {
		return 0, "", err
	}
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	s.ApplyAuthHeaders(req, auth)
	resp, err := s.client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))
	return resp.StatusCode, string(respBody), nil
}

func extractEntityID(method, path, reqBody, respBody string) string {
	_ = respBody
	return PollEntityID(method, path, reqBody, "id")
}

func (s *SiteService) anchorPayload(ctx context.Context, orgSlug string, siteID uuid.UUID, method, path, reqBody, respBody, recordIDField string, integrity *IntegrityService) (string, error) {
	if integrity == nil {
		return "", fmt.Errorf("integrity service unavailable")
	}
	payload := BuildIntegrityPayload(reqBody, respBody)
	entityType := EndpointEntityType(path)
	entityID := PollEntityID(method, path, reqBody, recordIDField)
	_, err := integrity.Anchor(ctx, orgSlug, "poll", models.AnchorRequest{
		SiteID:     siteID.String(),
		EntityType: entityType,
		EntityID:   entityID,
		Payload:    payload,
	})
	return entityID, err
}

func (s *SiteService) verifyOrAnchorEndpoint(ctx context.Context, orgSlug string, siteID uuid.UUID, method, path, reqBody, respBody, recordIDField string, integrity *IntegrityService) (anchored, verified, tampered bool, err error) {
	if integrity == nil {
		return false, false, false, fmt.Errorf("integrity service unavailable")
	}
	payload := BuildIntegrityPayload(reqBody, respBody)
	entityType := EndpointEntityType(path)
	entityID := PollEntityID(method, path, reqBody, recordIDField)

	resp, err := integrity.Verify(ctx, orgSlug, models.VerifyRequest{
		EntityType: entityType,
		EntityID:   entityID,
		Payload:    payload,
	})
	if err != nil {
		return false, false, false, err
	}
	if resp.HasAnchor {
		if resp.Intact {
			return false, true, false, nil
		}
		return false, false, true, nil
	}
	if _, err := s.anchorPayload(ctx, orgSlug, siteID, method, path, reqBody, respBody, recordIDField, integrity); err != nil {
		return false, false, false, err
	}
	return true, false, false, nil
}

func jsonRaw(s string) interface{} {
	if s == "" {
		return nil
	}
	var v interface{}
	if json.Unmarshal([]byte(s), &v) == nil {
		return v
	}
	return s
}

func (s *SiteService) IsProtectedEndpoint(ctx context.Context, orgSlug string, siteID uuid.UUID, method, path string) bool {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return false
	}
	var exists bool
	_ = pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM protected_endpoints
			WHERE site_id = $1 AND enabled = true
			AND UPPER(method) = UPPER($2) AND path_pattern = $3)`,
		siteID, method, path).Scan(&exists)
	return exists
}

func (s *SiteService) AnchorIfProtected(ctx context.Context, orgSlug, secret string, siteID uuid.UUID, method, path, reqBody, respBody string, integrity *IntegrityService) error {
	if !s.IsProtectedEndpoint(ctx, orgSlug, siteID, method, path) {
		return nil
	}
	if respBody == "" && reqBody == "" {
		return nil
	}
	_, err := s.anchorPayload(ctx, orgSlug, siteID, method, path, reqBody, respBody, "id", integrity)
	return err
}

type PollStats struct {
	Anchored  int `json:"anchored"`
	Verified  int `json:"verified"`
	Tampered  int `json:"tampered"`
	Skipped   int `json:"skipped"`
}

func (s *SiteService) PollProtectedEndpoints(ctx context.Context, orgSlug, secret string, integrity *IntegrityService) (PollStats, error) {
	stats := PollStats{}
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return stats, err
	}
	rows, err := pool.Query(ctx, `
		SELECT s.id, s.base_url, s.settings, pe.method, pe.path_pattern, COALESCE(pe.record_id_field, 'id')
		FROM sites s
		JOIN protected_endpoints pe ON pe.site_id = s.id
		WHERE pe.enabled = true AND s.integration_mode IN ('proxy', 'api')
		ORDER BY s.id`)
	if err != nil {
		return stats, err
	}
	defer rows.Close()

	for rows.Next() {
		var siteID uuid.UUID
		var baseURL string
		var settingsJSON []byte
		var method, path, recordIDField string
		if err := rows.Scan(&siteID, &baseURL, &settingsJSON, &method, &path, &recordIDField); err != nil {
			continue
		}
		settings := map[string]interface{}{}
		_ = json.Unmarshal(settingsJSON, &settings)
		auth := parseAuthFromSettings(settings, secret)
		if !auth.PollEnabled {
			stats.Skipped++
			continue
		}
		body := pollSampleBody(auth, path)
		if body == "" && strings.EqualFold(method, http.MethodPost) {
			body = `{}`
		}
		status, respBody, err := s.invokeEndpoint(ctx, orgSlug, secret, siteID, baseURL, settings, auth, method, path, body)
		if err != nil || status == 0 {
			continue
		}
		if status == 401 || status == 403 {
			continue
		}
		anchored, verified, tampered, err := s.verifyOrAnchorEndpoint(ctx, orgSlug, siteID, method, path, body, respBody, recordIDField, integrity)
		if err != nil {
			continue
		}
		if anchored {
			stats.Anchored++
		}
		if verified {
			stats.Verified++
		}
		if tampered {
			stats.Tampered++
		}
	}
	return stats, nil
}

func (s *SiteService) ListCaptureLogs(ctx context.Context, orgSlug string, siteID uuid.UUID, limit int) ([]models.ProxyCaptureLog, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 50
	}
	rows, err := pool.Query(ctx, `
		SELECT id, site_id, method, path, status_code, request_body, response_body, captured_at
		FROM proxy_capture_logs WHERE site_id = $1
		ORDER BY captured_at DESC LIMIT $2`, siteID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.ProxyCaptureLog
	for rows.Next() {
		var l models.ProxyCaptureLog
		if err := rows.Scan(&l.ID, &l.SiteID, &l.Method, &l.Path, &l.StatusCode, &l.RequestBody, &l.ResponseBody, &l.CapturedAt); err != nil {
			continue
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func (s *SiteService) TenantAnalytics(ctx context.Context, orgSlug string) (map[string]interface{}, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	var totalRecords, totalIncidents, totalCaptures, protectedEps int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM integrity_records`).Scan(&totalRecords)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM tamper_incidents`).Scan(&totalIncidents)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM proxy_capture_logs`).Scan(&totalCaptures)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM protected_endpoints WHERE enabled = true`).Scan(&protectedEps)

	recordsByDay := []map[string]interface{}{}
	rows, _ := pool.Query(ctx, `
		SELECT DATE(created_at) as d, COUNT(*) FROM integrity_records
		WHERE created_at > NOW() - INTERVAL '14 days'
		GROUP BY DATE(created_at) ORDER BY d`)
	if rows != nil {
		for rows.Next() {
			var day time.Time
			var count int
			if rows.Scan(&day, &count) == nil {
				recordsByDay = append(recordsByDay, map[string]interface{}{
					"date": day.Format("2006-01-02"), "count": count,
				})
			}
		}
		rows.Close()
	}

	incidentsBySeverity := map[string]int{}
	rows2, _ := pool.Query(ctx, `SELECT severity, COUNT(*) FROM tamper_incidents GROUP BY severity`)
	if rows2 != nil {
		for rows2.Next() {
			var sev string
			var count int
			if rows2.Scan(&sev, &count) == nil {
				incidentsBySeverity[sev] = count
			}
		}
		rows2.Close()
	}

	statusBreakdown := map[string]int{}
	rows3, _ := pool.Query(ctx, `SELECT blockchain_status, COUNT(*) FROM integrity_records GROUP BY blockchain_status`)
	if rows3 != nil {
		for rows3.Next() {
			var st string
			var count int
			if rows3.Scan(&st, &count) == nil {
				statusBreakdown[st] = count
			}
		}
		rows3.Close()
	}

	return map[string]interface{}{
		"total_records":         totalRecords,
		"total_incidents":       totalIncidents,
		"total_captures":        totalCaptures,
		"protected_endpoints":   protectedEps,
		"records_by_day":        recordsByDay,
		"incidents_by_severity": incidentsBySeverity,
		"blockchain_status":     statusBreakdown,
	}, nil
}
