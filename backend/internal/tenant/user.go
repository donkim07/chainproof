package tenant

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ResolveTenantUserID maps a platform user email to the tenant users table ID.
func (r *Resolver) ResolveTenantUserID(ctx context.Context, orgSlug, email string) (*uuid.UUID, error) {
	pool, _, err := r.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	var id uuid.UUID
	err = pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1 AND active = true`, email).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &id, nil
}
