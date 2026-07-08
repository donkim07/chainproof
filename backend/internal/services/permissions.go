package services

import (
	"context"
	"errors"

	"github.com/chainproof/baas/internal/tenant"
)

// PermissionService resolves tenant-level RBAC for the authenticated platform user.
type PermissionService struct {
	tenants *tenant.Resolver
}

func NewPermissionService(tenants *tenant.Resolver) *PermissionService {
	return &PermissionService{tenants: tenants}
}

// UserPermissions returns permission codes for email within an organization tenant DB.
// Platform owners always receive admin role permissions for their org.
func (s *PermissionService) UserPermissions(ctx context.Context, orgSlug, email string, platformRole string) ([]string, error) {
	pool, _, err := s.tenants.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	if platformRole == "owner" {
		rows, err := pool.Query(ctx, `
			SELECT DISTINCT p.code
			FROM roles r
			JOIN role_permissions rp ON rp.role_id = r.id
			JOIN permissions p ON p.id = rp.permission_id
			WHERE r.name = 'admin'`)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		var perms []string
		for rows.Next() {
			var code string
			if rows.Scan(&code) == nil {
				perms = append(perms, code)
			}
		}
		return perms, nil
	}
	rows, err := pool.Query(ctx, `
		SELECT DISTINCT p.code
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id
		JOIN role_permissions rp ON rp.role_id = ur.role_id
		JOIN permissions p ON p.id = rp.permission_id
		WHERE u.email = $1 AND u.active = true`, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var perms []string
	for rows.Next() {
		var code string
		if rows.Scan(&code) == nil {
			perms = append(perms, code)
		}
	}
	return perms, nil
}

func (s *PermissionService) HasPermission(ctx context.Context, orgSlug, email, perm, platformRole string) (bool, error) {
	perms, err := s.UserPermissions(ctx, orgSlug, email, platformRole)
	if err != nil {
		return false, err
	}
	for _, p := range perms {
		if p == perm || p == "*" {
			return true, nil
		}
	}
	return false, nil
}

var ErrForbidden = errors.New("insufficient permissions")
