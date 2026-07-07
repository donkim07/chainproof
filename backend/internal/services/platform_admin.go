package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/chainproof/baas/internal/models"
	"github.com/google/uuid"
)

func (s *PlatformService) ListUsers(ctx context.Context) ([]models.PlatformUser, error) {
	rows, err := s.db.Pool.Query(ctx, `
		SELECT u.id, u.email, u.full_name, u.role, u.organization_id,
		       COALESCE(o.name, ''), COALESCE(o.slug, ''), u.active, u.last_login_at, u.created_at
		FROM platform_users u
		LEFT JOIN organizations o ON o.id = u.organization_id
		ORDER BY u.created_at DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.PlatformUser
	for rows.Next() {
		var u models.PlatformUser
		var lastLogin *time.Time
		var createdAt time.Time
		var active bool
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Role, &u.OrganizationID,
			&u.OrgName, &u.OrgSlug, &active, &lastLogin, &createdAt); err != nil {
			continue
		}
		users = append(users, u)
	}
	return users, nil
}

func (s *PlatformService) ListAuditLogs(ctx context.Context, limit int) ([]map[string]interface{}, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := s.db.Pool.Query(ctx, `
		SELECT a.id, a.action, a.resource_type, COALESCE(a.resource_id::text, ''),
		       a.metadata, a.ip_address, a.created_at, COALESCE(u.email, 'system')
		FROM platform_audit_logs a
		LEFT JOIN platform_users u ON u.id = a.actor_id
		ORDER BY a.created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var id, action, resourceType, resourceID, actorEmail string
		var metadata []byte
		var ip *string
		var createdAt time.Time
		if err := rows.Scan(&id, &action, &resourceType, &resourceID, &metadata, &ip, &createdAt, &actorEmail); err != nil {
			continue
		}
		entry := map[string]interface{}{
			"id": id, "action": action, "resource_type": resourceType,
			"resource_id": resourceID, "actor_email": actorEmail, "created_at": createdAt,
		}
		if ip != nil {
			entry["ip_address"] = *ip
		}
		logs = append(logs, entry)
	}
	if logs == nil {
		logs = []map[string]interface{}{}
	}
	return logs, nil
}

func (s *PlatformService) UpdateOrganization(ctx context.Context, orgID string, active *bool, planSlug *string) error {
	if active != nil {
		_, err := s.db.Pool.Exec(ctx, `UPDATE organizations SET active = $1, updated_at = NOW() WHERE id = $2`, *active, orgID)
		if err != nil {
			return err
		}
	}
	if planSlug != nil && *planSlug != "" {
		_, err := s.db.Pool.Exec(ctx, `
			UPDATE organizations SET plan_id = (SELECT id FROM plans WHERE slug = $1 LIMIT 1), updated_at = NOW()
			WHERE id = $2`, *planSlug, orgID)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *PlatformService) Stats(ctx context.Context) (map[string]interface{}, error) {
	overview, err := s.Overview(ctx)
	if err != nil {
		return nil, err
	}

	orgsByPlan := map[string]int{}
	rows, _ := s.db.Pool.Query(ctx, `
		SELECT COALESCE(p.slug, 'free'), COUNT(*)
		FROM organizations o LEFT JOIN plans p ON p.id = o.plan_id
		WHERE o.active = true GROUP BY p.slug`)
	if rows != nil {
		for rows.Next() {
			var plan string
			var count int
			if rows.Scan(&plan, &count) == nil {
				orgsByPlan[plan] = count
			}
		}
		rows.Close()
	}

	signupsByDay := []map[string]interface{}{}
	rows2, _ := s.db.Pool.Query(ctx, `
		SELECT DATE(created_at), COUNT(*) FROM organizations
		WHERE created_at > NOW() - INTERVAL '30 days'
		GROUP BY DATE(created_at) ORDER BY 1`)
	if rows2 != nil {
		for rows2.Next() {
			var day time.Time
			var count int
			if rows2.Scan(&day, &count) == nil {
				signupsByDay = append(signupsByDay, map[string]interface{}{
					"date": day.Format("2006-01-02"), "count": count,
				})
			}
		}
		rows2.Close()
	}

	var mrr float64
	_ = s.db.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(p.price_monthly), 0)
		FROM organizations o JOIN plans p ON p.id = o.plan_id
		WHERE o.active = true AND o.subscription_status = 'active'`).Scan(&mrr)

	overview["orgs_by_plan"] = orgsByPlan
	overview["signups_by_day"] = signupsByDay
	overview["estimated_mrr"] = mrr
	return overview, nil
}

func (s *PlatformService) ListPlansAdmin(ctx context.Context) ([]models.Plan, error) {
	return s.ListPlans(ctx)
}

func (s *PlatformService) UpdatePlan(ctx context.Context, planID uuid.UUID, req models.PlanUpdateRequest) (*models.Plan, error) {
	if req.Name != nil {
		_, err := s.db.Pool.Exec(ctx, `UPDATE plans SET name = $1 WHERE id = $2`, *req.Name, planID)
		if err != nil {
			return nil, err
		}
	}
	if req.PriceMonthly != nil {
		_, err := s.db.Pool.Exec(ctx, `UPDATE plans SET price_monthly = $1 WHERE id = $2`, *req.PriceMonthly, planID)
		if err != nil {
			return nil, err
		}
	}
	if req.MaxSites != nil {
		_, err := s.db.Pool.Exec(ctx, `UPDATE plans SET max_sites = $1 WHERE id = $2`, *req.MaxSites, planID)
		if err != nil {
			return nil, err
		}
	}
	if req.MaxEndpoints != nil {
		_, err := s.db.Pool.Exec(ctx, `UPDATE plans SET max_endpoints = $1 WHERE id = $2`, *req.MaxEndpoints, planID)
		if err != nil {
			return nil, err
		}
	}
	if req.MaxAnchorsMonthly != nil {
		_, err := s.db.Pool.Exec(ctx, `UPDATE plans SET max_anchors_monthly = $1 WHERE id = $2`, *req.MaxAnchorsMonthly, planID)
		if err != nil {
			return nil, err
		}
	}
	rows, err := s.db.Pool.Query(ctx, `
		SELECT id, name, slug, price_monthly, max_sites, max_endpoints, max_anchors_monthly, features
		FROM plans WHERE id = $1`, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, fmt.Errorf("plan not found")
	}
	var p models.Plan
	var featuresJSON []byte
	if err := rows.Scan(&p.ID, &p.Name, &p.Slug, &p.PriceMonthly,
		&p.MaxSites, &p.MaxEndpoints, &p.MaxAnchorsMonthly, &featuresJSON); err != nil {
		return nil, err
	}
	_ = json.Unmarshal(featuresJSON, &p.Features)
	return &p, nil
}
