package services

import (
	"context"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/tenant"
)

// PlatformAnalytics aggregates cross-tenant metrics for super-admin dashboards.
type PlatformAnalytics struct {
	platform *database.PlatformDB
	tenants  *tenant.Resolver
	scanner  *ScannerService
}

func NewPlatformAnalytics(platform *database.PlatformDB, tenants *tenant.Resolver) *PlatformAnalytics {
	return &PlatformAnalytics{
		platform: platform,
		tenants:  tenants,
		scanner:  NewScannerService(),
	}
}

func (a *PlatformAnalytics) ExtendedOverview(ctx context.Context) (map[string]interface{}, error) {
	base, err := NewPlatformService(a.platform).Stats(ctx)
	if err != nil {
		return nil, err
	}

	var totalSites, totalEndpoints, totalAnchors, openIncidents int
	rows, _ := a.platform.Pool.Query(ctx, `SELECT slug FROM organizations WHERE active = true`)
	if rows != nil {
		for rows.Next() {
			var slug string
			if rows.Scan(&slug) != nil {
				continue
			}
			pool, _, err := a.tenants.GetPool(ctx, slug)
			if err != nil {
				continue
			}
			var sites, endpoints, anchors, incidents int
			_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM sites`).Scan(&sites)
			_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM protected_endpoints`).Scan(&endpoints)
			_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM integrity_records`).Scan(&anchors)
			_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM tamper_incidents WHERE status != 'resolved'`).Scan(&incidents)
			totalSites += sites
			totalEndpoints += endpoints
			totalAnchors += anchors
			openIncidents += incidents
		}
		rows.Close()
	}

	scannerStatus := a.scanner.Status()
	base["total_sites"] = totalSites
	base["total_endpoints"] = totalEndpoints
	base["total_anchors"] = totalAnchors
	base["open_incidents"] = openIncidents
	base["scanner"] = scannerStatus
	base["blockchain_status"] = "connected"
	return base, nil
}

func (a *PlatformAnalytics) ListAllSites(ctx context.Context, limit int) ([]map[string]interface{}, error) {
	if limit <= 0 {
		limit = 100
	}
	var out []map[string]interface{}
	rows, err := a.platform.Pool.Query(ctx, `
		SELECT o.name, o.slug FROM organizations o WHERE o.active = true ORDER BY o.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var orgName, slug string
		if rows.Scan(&orgName, &slug) != nil {
			continue
		}
		pool, _, err := a.tenants.GetPool(ctx, slug)
		if err != nil {
			continue
		}
		siteRows, err := pool.Query(ctx, `
			SELECT s.id, s.name, s.base_url, s.status, s.created_at,
			       (SELECT COUNT(*) FROM protected_endpoints pe WHERE pe.site_id = s.id),
			       (SELECT COUNT(*) FROM integrity_records ir WHERE ir.site_id = s.id)
			FROM sites s ORDER BY s.created_at DESC LIMIT $1`, limit)
		if err != nil {
			continue
		}
		for siteRows.Next() {
			var id, name, baseURL, status string
			var createdAt interface{}
			var epCount, anchorCount int
			if siteRows.Scan(&id, &name, &baseURL, &status, &createdAt, &epCount, &anchorCount) == nil {
				out = append(out, map[string]interface{}{
					"org_name": orgName, "org_slug": slug,
					"id": id, "name": name, "base_url": baseURL, "status": status,
					"endpoints": epCount, "anchors": anchorCount, "created_at": createdAt,
				})
			}
		}
		siteRows.Close()
		if len(out) >= limit {
			break
		}
	}
	if out == nil {
		out = []map[string]interface{}{}
	}
	return out, nil
}

func (a *PlatformAnalytics) ListOpenIncidents(ctx context.Context, limit int) ([]map[string]interface{}, error) {
	if limit <= 0 {
		limit = 50
	}
	var out []map[string]interface{}
	rows, _ := a.platform.Pool.Query(ctx, `SELECT name, slug FROM organizations WHERE active = true`)
	if rows == nil {
		return out, nil
	}
	defer rows.Close()
	for rows.Next() {
		var orgName, slug string
		if rows.Scan(&orgName, &slug) != nil {
			continue
		}
		pool, _, err := a.tenants.GetPool(ctx, slug)
		if err != nil {
			continue
		}
		incRows, _ := pool.Query(ctx, `
			SELECT id, entity_type, entity_id, severity, status, detected_at
			FROM tamper_incidents WHERE status != 'resolved'
			ORDER BY detected_at DESC LIMIT $1`, limit)
		if incRows == nil {
			continue
		}
		for incRows.Next() {
			var id, entityType, entityID, severity, status string
			var detectedAt interface{}
			if incRows.Scan(&id, &entityType, &entityID, &severity, &status, &detectedAt) == nil {
				out = append(out, map[string]interface{}{
					"org_name": orgName, "org_slug": slug,
					"id": id, "entity_type": entityType, "entity_id": entityID,
					"severity": severity, "status": status, "detected_at": detectedAt,
				})
			}
		}
		incRows.Close()
	}
	if out == nil {
		out = []map[string]interface{}{}
	}
	return out, nil
}

func (a *PlatformAnalytics) ScannerStatus() ScannerStatus {
	return a.scanner.Status()
}
