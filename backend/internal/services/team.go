package services

import (
	"context"
	"fmt"
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

func (s *TeamService) ListPermissions(ctx context.Context, orgSlug string) ([]map[string]interface{}, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	rows, err := pool.Query(ctx, `SELECT code, description, category FROM permissions ORDER BY category, code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]interface{}
	for rows.Next() {
		var code, desc, cat string
		if rows.Scan(&code, &desc, &cat) == nil {
			out = append(out, map[string]interface{}{"code": code, "description": desc, "category": cat})
		}
	}
	return out, nil
}

func (s *TeamService) RolePermissions(ctx context.Context, orgSlug, roleName string) ([]string, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	rows, err := pool.Query(ctx, `
		SELECT p.code FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		JOIN roles r ON r.id = rp.role_id
		WHERE r.name = $1`, roleName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var codes []string
	for rows.Next() {
		var c string
		if rows.Scan(&c) == nil {
			codes = append(codes, c)
		}
	}
	return codes, nil
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

func (s *TeamService) UpdateUser(ctx context.Context, orgSlug string, userID, actorID uuid.UUID, req models.TeamUserUpdateRequest) error {
	if req.Active != nil && !*req.Active && actorID != uuid.Nil && userID == actorID {
		return fmt.Errorf("you cannot disable your own account")
	}
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

func (s *TeamService) SetRolePermissions(ctx context.Context, orgSlug, roleName string, codes []string) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	var roleID uuid.UUID
	err = pool.QueryRow(ctx, `SELECT id FROM roles WHERE name = $1`, roleName).Scan(&roleID)
	if err != nil {
		return fmt.Errorf("role not found")
	}
	if roleName == "admin" {
		return fmt.Errorf("admin role permissions cannot be modified")
	}
	_, err = pool.Exec(ctx, `DELETE FROM role_permissions WHERE role_id = $1`, roleID)
	if err != nil {
		return err
	}
	for _, code := range codes {
		_, _ = pool.Exec(ctx, `
			INSERT INTO role_permissions (role_id, permission_id)
			SELECT $1, id FROM permissions WHERE code = $2
			ON CONFLICT DO NOTHING`, roleID, code)
	}
	return nil
}
