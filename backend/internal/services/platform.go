package services

import (
	"context"
	"encoding/json"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/models"
)

type PlatformService struct {
	db *database.PlatformDB
}

func NewPlatformService(db *database.PlatformDB) *PlatformService {
	return &PlatformService{db: db}
}

func (s *PlatformService) ListPlans(ctx context.Context) ([]models.Plan, error) {
	rows, err := s.db.Pool.Query(ctx, `
		SELECT id, name, slug, price_monthly, max_sites, max_endpoints, max_anchors_monthly, features
		FROM plans WHERE active = true ORDER BY price_monthly`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []models.Plan
	for rows.Next() {
		var p models.Plan
		var featuresJSON []byte
		if err := rows.Scan(&p.ID, &p.Name, &p.Slug, &p.PriceMonthly,
			&p.MaxSites, &p.MaxEndpoints, &p.MaxAnchorsMonthly, &featuresJSON); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(featuresJSON, &p.Features)
		plans = append(plans, p)
	}
	return plans, nil
}

func (s *PlatformService) ListOrganizations(ctx context.Context) ([]models.Organization, error) {
	rows, err := s.db.Pool.Query(ctx, `
		SELECT o.id, o.name, o.slug, o.plan_id, p.slug, o.subscription_status,
		       o.payment_status, o.active, o.created_at
		FROM organizations o
		LEFT JOIN plans p ON p.id = o.plan_id
		ORDER BY o.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orgs []models.Organization
	for rows.Next() {
		var o models.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.PlanID, &o.PlanSlug,
			&o.SubscriptionStatus, &o.PaymentStatus, &o.Active, &o.CreatedAt); err != nil {
			return nil, err
		}
		orgs = append(orgs, o)
	}
	return orgs, nil
}

func (s *PlatformService) Overview(ctx context.Context) (map[string]interface{}, error) {
	var orgCount int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM organizations WHERE active = true`).Scan(&orgCount)

	var userCount int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM platform_users WHERE active = true`).Scan(&userCount)

	var planCount int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM plans WHERE active = true`).Scan(&planCount)

	var activeSubs int
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM organizations WHERE active = true AND subscription_status = 'active'`).Scan(&activeSubs)

	orgs, _ := s.ListOrganizations(ctx)

	return map[string]interface{}{
		"total_organizations": orgCount,
		"total_users":         userCount,
		"active_subscriptions": activeSubs,
		"total_plans":         planCount,
		"organizations":       orgs,
	}, nil
}
