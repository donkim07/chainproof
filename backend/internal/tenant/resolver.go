package tenant

import (
	"context"
	"fmt"

	"github.com/chainproof/baas/internal/config"
	"github.com/chainproof/baas/internal/database"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Resolver struct {
	platform *database.PlatformDB
	cfg      *config.Config
	pools    map[string]*pgxpool.Pool
}

func NewResolver(platform *database.PlatformDB, cfg *config.Config) *Resolver {
	return &Resolver{platform: platform, cfg: cfg, pools: make(map[string]*pgxpool.Pool)}
}

func (r *Resolver) GetPool(ctx context.Context, orgSlug string) (*pgxpool.Pool, string, error) {
	var dbName string
	err := r.platform.Pool.QueryRow(ctx,
		`SELECT db_name FROM organizations WHERE slug = $1 AND active = true`, orgSlug).Scan(&dbName)
	if err != nil {
		return nil, "", fmt.Errorf("organization not found: %w", err)
	}

	if pool, ok := r.pools[dbName]; ok {
		return pool, dbName, nil
	}

	pool, err := database.TenantPool(ctx, r.cfg.TenantDBHost, r.cfg.TenantDBPort,
		r.cfg.TenantDBUser, r.cfg.TenantDBPassword, dbName)
	if err != nil {
		return nil, "", err
	}
	r.pools[dbName] = pool
	return pool, dbName, nil
}

func (r *Resolver) GetPoolByOrgID(ctx context.Context, orgID uuid.UUID) (*pgxpool.Pool, string, error) {
	var slug string
	err := r.platform.Pool.QueryRow(ctx,
		`SELECT slug FROM organizations WHERE id = $1 AND active = true`, orgID).Scan(&slug)
	if err != nil {
		return nil, "", err
	}
	pool, _, err := r.GetPool(ctx, slug)
	return pool, slug, err
}

func (r *Resolver) Close() {
	for _, p := range r.pools {
		p.Close()
	}
}
