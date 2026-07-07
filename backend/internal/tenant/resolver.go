package tenant

import (
	"context"
	"fmt"
	"log"
	"sync"

	"github.com/chainproof/baas/internal/config"
	"github.com/chainproof/baas/internal/database"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Resolver struct {
	platform         *database.PlatformDB
	cfg              *config.Config
	tenantMigrations string
	pools            map[string]*pgxpool.Pool
	migrated         map[string]bool
	mu               sync.Mutex
}

func NewResolver(platform *database.PlatformDB, cfg *config.Config, tenantMigrations string) *Resolver {
	return &Resolver{
		platform: platform, cfg: cfg, tenantMigrations: tenantMigrations,
		pools: make(map[string]*pgxpool.Pool), migrated: make(map[string]bool),
	}
}

func (r *Resolver) ensureMigrated(ctx context.Context, dbName string) error {
	r.mu.Lock()
	if r.migrated[dbName] {
		r.mu.Unlock()
		return nil
	}
	if r.tenantMigrations == "" {
		r.migrated[dbName] = true
		r.mu.Unlock()
		return nil
	}
	r.mu.Unlock()

	tenantURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		r.cfg.TenantDBUser, r.cfg.TenantDBPassword, r.cfg.TenantDBHost, r.cfg.TenantDBPort, dbName)
	pool, err := pgxpool.New(ctx, tenantURL)
	if err != nil {
		return fmt.Errorf("tenant migrate connect %s: %w", dbName, err)
	}
	defer pool.Close()
	if err := database.RunSQLMigrations(ctx, pool, r.tenantMigrations); err != nil {
		return fmt.Errorf("tenant migrate %s: %w", dbName, err)
	}
	r.mu.Lock()
	r.migrated[dbName] = true
	r.mu.Unlock()
	return nil
}

func (r *Resolver) GetPool(ctx context.Context, orgSlug string) (*pgxpool.Pool, string, error) {
	var dbName string
	err := r.platform.Pool.QueryRow(ctx,
		`SELECT db_name FROM organizations WHERE slug = $1 AND active = true`, orgSlug).Scan(&dbName)
	if err != nil {
		return nil, "", fmt.Errorf("organization not found: %w", err)
	}

	if err := r.ensureMigrated(ctx, dbName); err != nil {
		log.Printf("%v", err)
		return nil, "", err
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
