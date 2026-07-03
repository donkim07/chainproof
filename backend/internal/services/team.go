package services

import (
	"context"
	"strings"

	"github.com/chainproof/baas/internal/auth"
	"github.com/chainproof/baas/internal/models"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
)

type TeamService struct {
	tenant *tenant.Resolver
}

func NewTeamService(t *tenant.Resolver) *TeamService {
	return &TeamService{tenant: t}
}

func (s *TeamService) ListUsers(ctx context.Context, orgSlug string) ([]models.TenantUser, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
		SELECT u.id, u.email, u.full_name, u.active,
		       COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}')
		FROM users u
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN roles r ON r.id = ur.role_id
		GROUP BY u.id, u.email, u.full_name, u.active
		ORDER BY u.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.TenantUser
	for rows.Next() {
		var u models.TenantUser
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Active, &u.Roles); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func (s *TeamService) ListRoles(ctx context.Context, orgSlug string) ([]models.Role, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	rows, err := pool.Query(ctx, `SELECT id, name, COALESCE(description,''), is_system FROM roles ORDER BY is_system DESC, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []models.Role
	for rows.Next() {
		var r models.Role
		if err := rows.Scan(&r.ID, &r.Name, &r.Description, &r.IsSystem); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, nil
}

func (s *TeamService) CreateUser(ctx context.Context, orgSlug string, req models.TeamUserCreateRequest) (*models.TenantUser, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	pass, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	id := uuid.New()
	_, err = pool.Exec(ctx, `INSERT INTO users (id, email, password_hash, full_name) VALUES ($1, $2, $3, $4)`,
		id, strings.ToLower(strings.TrimSpace(req.Email)), pass, req.FullName)
	if err != nil {
		return nil, err
	}
	if len(req.Roles) == 0 {
		req.Roles = []string{"viewer"}
	}
	for _, role := range req.Roles {
		_, _ = pool.Exec(ctx, `
			INSERT INTO user_roles (user_id, role_id)
			SELECT $1, id FROM roles WHERE name = $2
			ON CONFLICT DO NOTHING`, id, role)
	}
	users, err := s.ListUsers(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	for _, u := range users {
		if u.ID == id {
			return &u, nil
		}
	}
	return nil, nil
}

func (s *TeamService) UpdateUser(ctx context.Context, orgSlug string, userID uuid.UUID, req models.TeamUserUpdateRequest) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	if req.FullName != nil {
		_, err = pool.Exec(ctx, `UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2`, *req.FullName, userID)
		if err != nil {
			return err
		}
	}
	if req.Active != nil {
		_, err = pool.Exec(ctx, `UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2`, *req.Active, userID)
		if err != nil {
			return err
		}
	}
	if req.Roles != nil {
		_, _ = pool.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1`, userID)
		for _, role := range *req.Roles {
			_, _ = pool.Exec(ctx, `
				INSERT INTO user_roles (user_id, role_id)
				SELECT $1, id FROM roles WHERE name = $2
				ON CONFLICT DO NOTHING`, userID, role)
		}
	}
	return nil
}
