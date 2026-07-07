package services

import (
	"context"
	"strings"

	"github.com/chainproof/baas/internal/tenant"
)

type SearchResult struct {
	Type  string `json:"type"`
	Label string `json:"label"`
	Path  string `json:"path"`
	Meta  string `json:"meta,omitempty"`
}

type DashboardSearchService struct {
	tenant *tenant.Resolver
}

func NewDashboardSearchService(t *tenant.Resolver) *DashboardSearchService {
	return &DashboardSearchService{tenant: t}
}

func (s *DashboardSearchService) Search(ctx context.Context, orgSlug, q string) ([]SearchResult, error) {
	q = strings.TrimSpace(q)
	if len(q) < 2 {
		return nil, nil
	}
	like := "%" + strings.ToLower(q) + "%"
	var results []SearchResult

	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
		SELECT name, base_url, id::text FROM sites
		WHERE LOWER(name) LIKE $1 OR LOWER(base_url) LIKE $1
		ORDER BY created_at DESC LIMIT 8`, like)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var name, url, id string
			if rows.Scan(&name, &url, &id) == nil {
				results = append(results, SearchResult{
					Type: "site", Label: name, Path: "/dashboard/sites", Meta: url,
				})
			}
		}
	}

	rows2, err := pool.Query(ctx, `
		SELECT entity_type, entity_id, id::text FROM tamper_incidents
		WHERE LOWER(entity_type) LIKE $1 OR LOWER(entity_id) LIKE $1
		ORDER BY detected_at DESC LIMIT 6`, like)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var et, eid, id string
			if rows2.Scan(&et, &eid, &id) == nil {
				results = append(results, SearchResult{
					Type: "incident", Label: et + " · " + eid, Path: "/dashboard/incidents", Meta: "Tamper alert",
				})
			}
		}
	}

	rows3, err := pool.Query(ctx, `
		SELECT entity_type, entity_id, id::text FROM integrity_records
		WHERE LOWER(entity_type) LIKE $1 OR LOWER(entity_id) LIKE $1 OR LOWER(payload_hash) LIKE $1
		ORDER BY created_at DESC LIMIT 6`, like)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var et, eid, id string
			if rows3.Scan(&et, &eid, &id) == nil {
				results = append(results, SearchResult{
					Type: "record", Label: et + " · " + eid, Path: "/dashboard/records", Meta: "Anchored record",
				})
			}
		}
	}

	rows4, err := pool.Query(ctx, `
		SELECT full_name, email, id::text FROM users
		WHERE LOWER(full_name) LIKE $1 OR LOWER(email) LIKE $1
		LIMIT 5`, like)
	if err == nil {
		defer rows4.Close()
		for rows4.Next() {
			var name, email, id string
			if rows4.Scan(&name, &email, &id) == nil {
				results = append(results, SearchResult{
					Type: "team", Label: name, Path: "/dashboard/team", Meta: email,
				})
			}
		}
	}

	return results, nil
}
