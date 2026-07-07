package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"golang.org/x/net/html"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/chainproof/baas/internal/models"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SiteService struct {
	tenant  *tenant.Resolver
	client  *http.Client
	scanner *ScannerService
}

func NewSiteService(t *tenant.Resolver) *SiteService {
	return &SiteService{
		tenant:  t,
		client:  &http.Client{Timeout: 10 * time.Second},
		scanner: NewScannerService(),
	}
}

func (s *SiteService) Create(ctx context.Context, orgSlug string, site models.Site) (*models.Site, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	site.ID = uuid.New()
	site.Status = "active"
	site.CreatedAt = time.Now()
	if site.IntegrationMode == "" {
		site.IntegrationMode = "api"
	}
	if !isSafeExternalURL(site.BaseURL) {
		return nil, errors.New("base_url must be a valid public http(s) URL")
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO sites (id, name, base_url, integration_mode, status, db_type)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		site.ID, site.Name, site.BaseURL, site.IntegrationMode, site.Status, site.DBType)
	if err != nil {
		return nil, err
	}
	return &site, nil
}

func (s *SiteService) List(ctx context.Context, orgSlug string) ([]models.Site, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
		SELECT id, name, base_url, integration_mode, status, db_type, created_at
		FROM sites ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sites []models.Site
	for rows.Next() {
		var site models.Site
		if err := rows.Scan(&site.ID, &site.Name, &site.BaseURL, &site.IntegrationMode,
			&site.Status, &site.DBType, &site.CreatedAt); err != nil {
			return nil, err
		}
		sites = append(sites, site)
	}
	return sites, nil
}

func (s *SiteService) DiscoverEndpoints(ctx context.Context, orgSlug string, siteID uuid.UUID) (*models.DiscoverResult, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	var baseURL string
	err = pool.QueryRow(ctx, `SELECT base_url FROM sites WHERE id = $1`, siteID).Scan(&baseURL)
	if err != nil {
		return nil, fmt.Errorf("site not found")
	}

	baseURL = strings.TrimRight(baseURL, "/")
	u, err := url.Parse(baseURL)
	if err != nil {
		return nil, fmt.Errorf("invalid base url")
	}

	passiveCandidates, wordlistCandidates := s.collectDiscoveryCandidates(ctx, u)
	discovered := s.probeAndCollect(ctx, pool, siteID, baseURL, passiveCandidates, true)
	result := &models.DiscoverResult{Discovered: discovered}

	if len(discovered) == 0 {
		result.Suggestions = s.probeAndCollect(ctx, pool, siteID, baseURL, wordlistCandidates, false)
	}
	return result, nil
}

func (s *SiteService) probeAndCollect(ctx context.Context, pool *pgxpool.Pool, siteID uuid.UUID, baseURL string, candidates map[string][]string, persist bool) []models.DiscoveredEndpoint {
	type pathProbe struct {
		path     string
		sources  []string
		priority int
	}
	probes := make([]pathProbe, 0, len(candidates))
	for path, sources := range candidates {
		probes = append(probes, pathProbe{path: path, sources: sources, priority: discoveryPriority(sources)})
	}
	sort.Slice(probes, func(i, j int) bool {
		if probes[i].priority != probes[j].priority {
			return probes[i].priority > probes[j].priority
		}
		return probes[i].path < probes[j].path
	})

	var out []models.DiscoveredEndpoint
	for _, probe := range probes {
		status, methods := s.probeEndpoint(ctx, baseURL, probe.path)
		if status == 0 {
			continue
		}
		for _, method := range methods {
			ep := models.DiscoveredEndpoint{
				Method: method, Path: probe.path, Status: status,
				Source: primarySource(probe.sources), Sources: probe.sources, Priority: probe.priority,
			}
			out = append(out, ep)
			if persist {
				_, _ = pool.Exec(ctx, `
					INSERT INTO protected_endpoints (site_id, method, path_pattern, enabled, auto_discovered)
					VALUES ($1, $2, $3, false, true)
					ON CONFLICT (site_id, method, path_pattern) DO NOTHING`,
					siteID, method, probe.path)
			}
		}
	}
	sortDiscovered(out)
	return out
}

func (s *SiteService) AddEndpoint(ctx context.Context, orgSlug string, siteID uuid.UUID, method, pathPattern string) (*models.ProtectedEndpoint, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	method = strings.ToUpper(strings.TrimSpace(method))
	pathPattern = strings.TrimSpace(pathPattern)
	if method == "" || pathPattern == "" {
		return nil, errors.New("method and path are required")
	}
	if !strings.HasPrefix(pathPattern, "/") {
		pathPattern = "/" + pathPattern
	}
	var exists bool
	_ = pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM sites WHERE id = $1)`, siteID).Scan(&exists)
	if !exists {
		return nil, fmt.Errorf("site not found")
	}
	ep := models.ProtectedEndpoint{
		SiteID:         siteID,
		Method:         method,
		PathPattern:    pathPattern,
		Enabled:        false,
		AutoDiscovered: false,
	}
	err = pool.QueryRow(ctx, `
		INSERT INTO protected_endpoints (site_id, method, path_pattern, enabled, auto_discovered)
		VALUES ($1, $2, $3, false, false)
		ON CONFLICT (site_id, method, path_pattern) DO UPDATE SET method = EXCLUDED.method
		RETURNING id, site_id, method, path_pattern, table_name, record_id_field, enabled, auto_discovered`,
		ep.SiteID, ep.Method, ep.PathPattern).Scan(
		&ep.ID, &ep.SiteID, &ep.Method, &ep.PathPattern,
		&ep.TableName, &ep.RecordIDField, &ep.Enabled, &ep.AutoDiscovered)
	if err != nil {
		return nil, err
	}
	return &ep, nil
}

func (s *SiteService) DeleteEndpoint(ctx context.Context, orgSlug string, endpointID uuid.UUID) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `DELETE FROM protected_endpoints WHERE id = $1`, endpointID)
	return err
}

func (s *SiteService) ListEndpoints(ctx context.Context, orgSlug string, siteID uuid.UUID) ([]models.ProtectedEndpoint, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
		SELECT id, site_id, method, path_pattern, table_name, record_id_field, enabled, auto_discovered
		FROM protected_endpoints WHERE site_id = $1 ORDER BY path_pattern`, siteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var endpoints []models.ProtectedEndpoint
	for rows.Next() {
		var ep models.ProtectedEndpoint
		if err := rows.Scan(&ep.ID, &ep.SiteID, &ep.Method, &ep.PathPattern,
			&ep.TableName, &ep.RecordIDField, &ep.Enabled, &ep.AutoDiscovered); err != nil {
			return nil, err
		}
		endpoints = append(endpoints, ep)
	}
	return endpoints, nil
}

func (s *SiteService) ToggleEndpoint(ctx context.Context, orgSlug string, endpointID uuid.UUID, enabled bool) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `UPDATE protected_endpoints SET enabled = $1 WHERE id = $2`, enabled, endpointID)
	return err
}

func (s *SiteService) Update(ctx context.Context, orgSlug string, siteID uuid.UUID, req models.SiteUpsertRequest) (*models.Site, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	mode := req.IntegrationMode
	if mode == "" {
		mode = "proxy"
	}
	if !isSafeExternalURL(req.BaseURL) {
		return nil, errors.New("base_url must be a valid public http(s) URL")
	}
	_, err = pool.Exec(ctx, `
		UPDATE sites
		SET name = $1, base_url = $2, integration_mode = $3, db_type = $4, updated_at = NOW()
		WHERE id = $5`, req.Name, req.BaseURL, mode, req.DBType, siteID)
	if err != nil {
		return nil, err
	}
	return s.Get(ctx, orgSlug, siteID)
}

func (s *SiteService) Delete(ctx context.Context, orgSlug string, siteID uuid.UUID) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `DELETE FROM sites WHERE id = $1`, siteID)
	return err
}

func (s *SiteService) Get(ctx context.Context, orgSlug string, siteID uuid.UUID) (*models.Site, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	var site models.Site
	err = pool.QueryRow(ctx, `
		SELECT id, name, base_url, integration_mode, status, db_type, created_at
		FROM sites WHERE id = $1`, siteID).
		Scan(&site.ID, &site.Name, &site.BaseURL, &site.IntegrationMode, &site.Status, &site.DBType, &site.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &site, nil
}

func (s *SiteService) CaptureProxyLog(ctx context.Context, orgSlug string, siteID uuid.UUID, method, path, query string, status int, requestHeaders, responseHeaders map[string][]string, requestBody, responseBody string, ip string) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	reqHdr, _ := json.Marshal(requestHeaders)
	respHdr, _ := json.Marshal(responseHeaders)
	_, err = pool.Exec(ctx, `
		INSERT INTO proxy_capture_logs
		(site_id, method, path, query_string, status_code, request_headers, request_body, response_headers, response_body, ip_address)
		VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,NULLIF($10,'')::inet)`,
		siteID, method, path, query, status, string(reqHdr), requestBody, string(respHdr), responseBody, ip)
	return err
}

func (s *SiteService) discoverFromHTML(ctx context.Context, base *url.URL) []string {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, base.String(), nil)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	doc, err := html.Parse(bytes.NewReader(body))
	if err != nil {
		return nil
	}

	pathSet := map[string]bool{}
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			for _, a := range n.Attr {
				if a.Key == "href" || a.Key == "src" || (a.Key == "action" && n.Data == "form") {
					if p := normalizePath(base, a.Val); p != "" {
						pathSet[p] = true
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	re := regexp.MustCompile(`(?i)(/[\w\-/\.]+)`)
	matches := re.FindAllString(string(body), -1)
	for _, m := range matches {
		if p := normalizePath(base, m); p != "" {
			pathSet[p] = true
		}
	}

	paths := make([]string, 0, len(pathSet))
	for p := range pathSet {
		paths = append(paths, p)
	}
	return paths
}

func (s *SiteService) probeEndpoint(ctx context.Context, baseURL, path string) (int, []string) {
	url := strings.TrimRight(baseURL, "/") + path
	status := 0
	methods := make([]string, 0, 2)
	for _, method := range []string{http.MethodGet, http.MethodPost} {
		req, _ := http.NewRequestWithContext(ctx, method, url, strings.NewReader(`{}`))
		if method == http.MethodPost {
			req.Header.Set("Content-Type", "application/json")
		}
		resp, err := s.client.Do(req)
		if err != nil {
			var nerr net.Error
			if errors.As(err, &nerr) && nerr.Timeout() {
				continue
			}
			continue
		}
		io.Copy(io.Discard, io.LimitReader(resp.Body, 512))
		resp.Body.Close()
		if isDiscoveredStatus(resp.StatusCode) {
			status = resp.StatusCode
			methods = append(methods, method)
		}
	}
	return status, methods
}

func isDiscoveredStatus(status int) bool {
	return status == http.StatusOK || status == http.StatusUnauthorized || status == http.StatusForbidden
}

func normalizePath(base *url.URL, raw string) string {
	if raw == "" || strings.HasPrefix(raw, "#") || strings.HasPrefix(raw, "javascript:") {
		return ""
	}
	u, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	if u.Host != "" && !strings.EqualFold(u.Host, base.Host) {
		return ""
	}
	p := u.Path
	if p == "" {
		return ""
	}
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	if len(p) > 150 || strings.Contains(p, "..") {
		return ""
	}
	if shouldSkipPath(p) {
		return ""
	}
	return p
}

func shouldSkipPath(path string) bool {
	p := strings.ToLower(path)
	for _, x := range []string{"/body", "/head", "/html", "/script", "/style", "/title", "/noscript", "/app-root", "/x-icon"} {
		if p == x {
			return true
		}
	}
	for _, ext := range []string{".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".map"} {
		if strings.HasSuffix(p, ext) {
			return true
		}
	}
	return false
}
