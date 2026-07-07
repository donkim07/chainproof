package services

import (
	"context"
	"fmt"

	"github.com/chainproof/baas/internal/tenant"
)

type PlanLimits struct {
	MaxSites          int
	MaxEndpoints      int
	MaxAnchorsMonthly int
	PlanSlug          string
}

func (s *PlatformService) GetOrgPlanLimits(ctx context.Context, orgSlug string) (*PlanLimits, error) {
	var lim PlanLimits
	err := s.db.Pool.QueryRow(ctx, `
		SELECT COALESCE(p.slug, 'free'), COALESCE(p.max_sites, 1), COALESCE(p.max_endpoints, 5), COALESCE(p.max_anchors_monthly, 500)
		FROM organizations o
		LEFT JOIN plans p ON p.id = o.plan_id
		WHERE o.slug = $1 AND o.active = true`, orgSlug).
		Scan(&lim.PlanSlug, &lim.MaxSites, &lim.MaxEndpoints, &lim.MaxAnchorsMonthly)
	if err != nil {
		return nil, err
	}
	return &lim, nil
}

func unlimited(n int) bool { return n < 0 }

func (s *PlatformService) EnforceSiteLimit(ctx context.Context, orgSlug string, resolver *tenant.Resolver) error {
	lim, err := s.GetOrgPlanLimits(ctx, orgSlug)
	if err != nil {
		return err
	}
	if unlimited(lim.MaxSites) {
		return nil
	}
	pool, _, err := resolver.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	var count int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM sites`).Scan(&count)
	if count >= lim.MaxSites {
		return fmt.Errorf("plan limit reached: %s plan allows %d site(s). Upgrade to add more", lim.PlanSlug, lim.MaxSites)
	}
	return nil
}

func (s *PlatformService) EnforceEndpointLimit(ctx context.Context, orgSlug string, resolver *tenant.Resolver, siteID string) error {
	lim, err := s.GetOrgPlanLimits(ctx, orgSlug)
	if err != nil {
		return err
	}
	if unlimited(lim.MaxEndpoints) {
		return nil
	}
	pool, _, err := resolver.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	var count int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM protected_endpoints WHERE site_id = $1`, siteID).Scan(&count)
	if count >= lim.MaxEndpoints {
		return fmt.Errorf("plan limit reached: %s plan allows %d endpoints per site", lim.PlanSlug, lim.MaxEndpoints)
	}
	return nil
}

func (s *PlatformService) EnforceAnchorLimit(ctx context.Context, orgSlug string, resolver *tenant.Resolver) error {
	lim, err := s.GetOrgPlanLimits(ctx, orgSlug)
	if err != nil {
		return err
	}
	if unlimited(lim.MaxAnchorsMonthly) {
		return nil
	}
	pool, _, err := resolver.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	var count int
	_ = pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM integrity_records
		WHERE created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')`).Scan(&count)
	if count >= lim.MaxAnchorsMonthly {
		return fmt.Errorf("monthly anchor limit reached: %s plan allows %d anchors/month", lim.PlanSlug, lim.MaxAnchorsMonthly)
	}
	return nil
}
