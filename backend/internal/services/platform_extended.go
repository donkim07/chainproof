package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/chainproof/baas/internal/auth"
	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
)

type PlatformExtended struct {
	platform *database.PlatformDB
	tenants  *tenant.Resolver
	jwt      *auth.JWTService
}

func NewPlatformExtended(platform *database.PlatformDB, tenants *tenant.Resolver, jwt *auth.JWTService) *PlatformExtended {
	return &PlatformExtended{platform: platform, tenants: tenants, jwt: jwt}
}

func (p *PlatformExtended) GetSettings(ctx context.Context, key string) (map[string]interface{}, error) {
	var raw []byte
	err := p.platform.Pool.QueryRow(ctx, `SELECT value FROM platform_settings WHERE key = $1`, key).Scan(&raw)
	if err != nil {
		return map[string]interface{}{}, nil
	}
	var out map[string]interface{}
	_ = json.Unmarshal(raw, &out)
	return out, nil
}

func (p *PlatformExtended) UpdateSettings(ctx context.Context, key string, value map[string]interface{}) error {
	b, _ := json.Marshal(value)
	_, err := p.platform.Pool.Exec(ctx, `
		INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, key, b)
	return err
}

func (p *PlatformExtended) ListWordlists(ctx context.Context) ([]map[string]interface{}, error) {
	rows, err := p.platform.Pool.Query(ctx, `
		SELECT id, name, version, path, is_default, line_count, created_at
		FROM scanner_wordlists ORDER BY is_default DESC, created_at DESC`)
	if err != nil {
		return defaultWordlistEntry(), nil
	}
	defer rows.Close()
	var out []map[string]interface{}
	for rows.Next() {
		var id, name, version, path string
		var isDefault bool
		var lineCount int
		var createdAt time.Time
		if rows.Scan(&id, &name, &version, &path, &isDefault, &lineCount, &createdAt) == nil {
			out = append(out, map[string]interface{}{
				"id": id, "name": name, "version": version, "path": path,
				"is_default": isDefault, "line_count": lineCount, "created_at": createdAt,
			})
		}
	}
	if len(out) == 0 {
		return defaultWordlistEntry(), nil
	}
	return out, nil
}

func defaultWordlistEntry() []map[string]interface{} {
	sc := NewScannerService()
	st := sc.Status()
	lines := 0
	if st.WordlistOK {
		if data, err := os.ReadFile(st.WordlistPath); err == nil {
			lines = len(strings.Split(strings.TrimSpace(string(data)), "\n"))
		}
	}
	return []map[string]interface{}{{
		"id": "builtin", "name": "api-common", "version": "1.0",
		"path": st.WordlistPath, "is_default": true, "line_count": lines,
	}}
}

func (p *PlatformExtended) SaveWordlist(ctx context.Context, name, content string) (map[string]interface{}, error) {
	dir := filepath.Join("data", "wordlists", "uploads")
	_ = os.MkdirAll(dir, 0755)
	id := uuid.New()
	filename := fmt.Sprintf("%s-%s.txt", name, id.String()[:8])
	path := filepath.Join(dir, filename)
	lines := strings.Split(strings.TrimSpace(content), "\n")
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")), 0644); err != nil {
		return nil, err
	}
	version := time.Now().Format("2006.01.02")
	_, err := p.platform.Pool.Exec(ctx, `
		INSERT INTO scanner_wordlists (id, name, version, path, line_count)
		VALUES ($1, $2, $3, $4, $5)`, id, name, version, path, len(lines))
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id": id.String(), "name": name, "version": version,
		"path": path, "line_count": len(lines),
	}, nil
}

func (p *PlatformExtended) BillingOverview(ctx context.Context) (map[string]interface{}, error) {
	analytics := NewPlatformAnalytics(p.platform, p.tenants)
	overview, err := analytics.ExtendedOverview(ctx)
	if err != nil {
		return nil, err
	}
	usage := []map[string]interface{}{}
	rows, _ := p.platform.Pool.Query(ctx, `
		SELECT o.name, o.slug, COALESCE(p.slug, 'free'), COALESCE(p.price_monthly, 0), o.subscription_status
		FROM organizations o LEFT JOIN plans p ON p.id = o.plan_id
		WHERE o.active = true ORDER BY o.created_at DESC LIMIT 100`)
	if rows != nil {
		for rows.Next() {
			var name, slug, plan, status string
			var price float64
			if rows.Scan(&name, &slug, &plan, &price, &status) == nil {
				usage = append(usage, map[string]interface{}{
					"org_name": name, "org_slug": slug, "plan": plan,
					"mrr": price, "status": status,
				})
			}
		}
		rows.Close()
	}
	return map[string]interface{}{
		"estimated_mrr": overview["estimated_mrr"],
		"active_subscriptions": overview["active_subscriptions"],
		"clients": usage,
	}, nil
}

func (p *PlatformExtended) UsageReportCSV(ctx context.Context) (string, error) {
	billing, err := p.BillingOverview(ctx)
	if err != nil {
		return "", err
	}
	var b strings.Builder
	b.WriteString("org_name,org_slug,plan,mrr,status\n")
	for _, row := range billing["clients"].([]map[string]interface{}) {
		b.WriteString(fmt.Sprintf("%q,%q,%q,%v,%q\n",
			row["org_name"], row["org_slug"], row["plan"], row["mrr"], row["status"]))
	}
	return b.String(), nil
}

func (p *PlatformExtended) Impersonate(ctx context.Context, targetUserID uuid.UUID) (string, time.Time, error) {
	var email, role, orgSlug string
	var orgID *uuid.UUID
	err := p.platform.Pool.QueryRow(ctx, `
		SELECT u.email, u.role, COALESCE(o.slug, ''), u.organization_id
		FROM platform_users u LEFT JOIN organizations o ON o.id = u.organization_id
		WHERE u.id = $1 AND u.active = true`, targetUserID).Scan(&email, &role, &orgSlug, &orgID)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("user not found")
	}
	if role == "super_admin" {
		return "", time.Time{}, fmt.Errorf("cannot impersonate super admin")
	}
	return p.jwt.Generate(targetUserID, email, role, orgID, orgSlug)
}

func (s *SiteService) ForceIntegrityCheck(ctx context.Context, orgSlug string, siteID uuid.UUID) (map[string]interface{}, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	var baseURL string
	err = pool.QueryRow(ctx, `SELECT base_url FROM sites WHERE id = $1`, siteID).Scan(&baseURL)
	if err != nil {
		return nil, fmt.Errorf("site not found")
	}
	result, err := s.DiscoverEndpoints(ctx, orgSlug, siteID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"base_url": baseURL,
		"discovered": len(result.Discovered),
		"suggestions": len(result.Suggestions),
		"message": "Discovery and integrity probe completed",
	}, nil
}

func (s *SiteService) ExportEndpointsCSV(ctx context.Context, orgSlug string, siteID uuid.UUID) (string, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return "", err
	}
	rows, err := pool.Query(ctx, `
		SELECT method, path_pattern, enabled, auto_discovered
		FROM protected_endpoints WHERE site_id = $1 ORDER BY path_pattern`, siteID)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	var b strings.Builder
	b.WriteString("method,path,enabled,auto_discovered\n")
	for rows.Next() {
		var method, path string
		var enabled, auto bool
		if rows.Scan(&method, &path, &enabled, &auto) == nil {
			b.WriteString(fmt.Sprintf("%s,%q,%t,%t\n", method, path, enabled, auto))
		}
	}
	return b.String(), nil
}

// ProbeSiteHealth checks base URL is reachable.
func (s *SiteService) ProbeSiteHealth(ctx context.Context, baseURL string) int {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(baseURL, "/")+"/health", nil)
	resp, err := s.client.Do(req)
	if err != nil {
		return 0
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	return resp.StatusCode
}
