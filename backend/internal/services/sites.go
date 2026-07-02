package services

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/chainproof/baas/internal/models"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
)

type SiteService struct {
	tenant *tenant.Resolver
	client *http.Client
}

func NewSiteService(t *tenant.Resolver) *SiteService {
	return &SiteService{
		tenant: t,
		client: &http.Client{Timeout: 10 * time.Second},
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

func (s *SiteService) DiscoverEndpoints(ctx context.Context, orgSlug string, siteID uuid.UUID) ([]models.DiscoveredEndpoint, error) {
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
	commonPaths := []string{
		"/api", "/api/v1", "/api/v2", "/api/health", "/health",
		"/api/users", "/api/employees", "/api/products", "/api/orders",
		"/api/transactions", "/api/records", "/api/data",
	}

	var discovered []models.DiscoveredEndpoint
	methods := []string{"GET", "POST", "PUT", "PATCH", "DELETE"}

	for _, path := range commonPaths {
		for _, method := range methods {
			if method != "GET" && method != "POST" {
				continue
			}
			url := baseURL + path
			req, _ := http.NewRequestWithContext(ctx, method, url, nil)
			resp, err := s.client.Do(req)
			if err != nil {
				continue
			}
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
			resp.Body.Close()

			if resp.StatusCode < 500 {
				ep := models.DiscoveredEndpoint{Method: method, Path: path, Status: resp.StatusCode}
				discovered = append(discovered, ep)

				_, _ = pool.Exec(ctx, `
					INSERT INTO protected_endpoints (site_id, method, path_pattern, enabled, auto_discovered)
					VALUES ($1, $2, $3, false, true)
					ON CONFLICT (site_id, method, path_pattern) DO NOTHING`,
					siteID, method, path)
				_ = body
			}
		}
	}

	if len(discovered) == 0 {
		discovered = append(discovered, models.DiscoveredEndpoint{Method: "POST", Path: "/api/*", Status: 0})
	}
	return discovered, nil
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
