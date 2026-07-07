package services

import (
	"context"
	"time"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
)

type OrgBillingOverview struct {
	PlanSlug           string `json:"plan_slug"`
	PlanName           string `json:"plan_name"`
	PriceMonthly       float64 `json:"price_monthly"`
	MaxSites           int    `json:"max_sites"`
	MaxEndpoints       int    `json:"max_endpoints"`
	MaxAnchorsMonthly  int    `json:"max_anchors_monthly"`
	SubscriptionStatus string `json:"subscription_status"`
	SitesUsed          int    `json:"sites_used"`
	AnchorsThisMonth   int    `json:"anchors_this_month"`
}

type OrgInvoice struct {
	ID          string    `json:"id"`
	PeriodStart time.Time `json:"period_start"`
	PeriodEnd   time.Time `json:"period_end"`
	Amount      float64   `json:"amount"`
	Status      string    `json:"status"`
	PlanSlug    string    `json:"plan_slug"`
}

type OrgBillingService struct {
	platform *database.PlatformDB
	tenant   *tenant.Resolver
}

func NewOrgBillingService(platform *database.PlatformDB, tenant *tenant.Resolver) *OrgBillingService {
	return &OrgBillingService{platform: platform, tenant: tenant}
}

func (s *OrgBillingService) Overview(ctx context.Context, orgSlug string) (*OrgBillingOverview, error) {
	var ov OrgBillingOverview
	err := s.platform.Pool.QueryRow(ctx, `
		SELECT COALESCE(p.slug, 'free'), COALESCE(p.name, 'Free'), COALESCE(p.price_monthly, 0),
		       COALESCE(p.max_sites, 1), COALESCE(p.max_endpoints, 5), COALESCE(p.max_anchors_monthly, 500),
		       COALESCE(o.subscription_status, 'active')
		FROM organizations o
		LEFT JOIN plans p ON p.id = o.plan_id
		WHERE o.slug = $1`, orgSlug).Scan(
		&ov.PlanSlug, &ov.PlanName, &ov.PriceMonthly,
		&ov.MaxSites, &ov.MaxEndpoints, &ov.MaxAnchorsMonthly, &ov.SubscriptionStatus)
	if err != nil {
		return nil, err
	}
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return &ov, nil
	}
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM sites`).Scan(&ov.SitesUsed)
	_ = pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM integrity_records
		WHERE created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')`).Scan(&ov.AnchorsThisMonth)
	return &ov, nil
}

func (s *OrgBillingService) ListInvoices(ctx context.Context, orgSlug string) ([]OrgInvoice, error) {
	var orgID uuid.UUID
	var planSlug string
	var price float64
	err := s.platform.Pool.QueryRow(ctx, `
		SELECT o.id, COALESCE(p.slug, 'free'), COALESCE(p.price_monthly, 0)
		FROM organizations o LEFT JOIN plans p ON p.id = o.plan_id WHERE o.slug = $1`, orgSlug).
		Scan(&orgID, &planSlug, &price)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	invoices := []OrgInvoice{
		{
			ID:          orgID.String()[:8] + "-current",
			PeriodStart: time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:   time.Date(now.Year(), now.Month()+1, 0, 23, 59, 59, 0, time.UTC),
			Amount:      price,
			Status:      "current",
			PlanSlug:    planSlug,
		},
	}
	if price > 0 {
		prev := now.AddDate(0, -1, 0)
		invoices = append(invoices, OrgInvoice{
			ID:          orgID.String()[:8] + "-prev",
			PeriodStart: time.Date(prev.Year(), prev.Month(), 1, 0, 0, 0, 0, time.UTC),
			PeriodEnd:   time.Date(prev.Year(), prev.Month()+1, 0, 23, 59, 59, 0, time.UTC),
			Amount:      price,
			Status:      "paid",
			PlanSlug:    planSlug,
		})
	}
	return invoices, nil
}

func (s *OrgBillingService) RequestPlanChange(ctx context.Context, orgSlug, planSlug string) error {
	var planID uuid.UUID
	err := s.platform.Pool.QueryRow(ctx, `SELECT id FROM plans WHERE slug = $1 AND active = true`, planSlug).Scan(&planID)
	if err != nil {
		return err
	}
	_, err = s.platform.Pool.Exec(ctx, `
		UPDATE organizations SET plan_id = $1, updated_at = NOW() WHERE slug = $2`, planID, orgSlug)
	return err
}
