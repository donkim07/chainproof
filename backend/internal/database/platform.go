package database

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PlatformDB struct {
	Pool *pgxpool.Pool
}

func NewPlatformDB(ctx context.Context, databaseURL string) (*PlatformDB, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect platform db: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping platform db: %w", err)
	}
	return &PlatformDB{Pool: pool}, nil
}

func (db *PlatformDB) Close() {
	db.Pool.Close()
}

func (db *PlatformDB) RunMigrations(ctx context.Context, migrationsDir string) error {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		sql, err := os.ReadFile(filepath.Join(migrationsDir, e.Name()))
		if err != nil {
			return err
		}
		if _, err := db.Pool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("migration %s: %w", e.Name(), err)
		}
	}
	return nil
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func Slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "org"
	}
	return s
}

func TenantDBName(slug string) string {
	return "chainproof_tenant_" + strings.ReplaceAll(slug, "-", "_")
}

func (db *PlatformDB) ProvisionTenantDB(ctx context.Context, host, port, user, password, dbName, migrationsDir string) error {
	adminURL := fmt.Sprintf("postgres://%s:%s@%s:%s/postgres?sslmode=disable", user, password, host, port)
	adminPool, err := pgxpool.New(ctx, adminURL)
	if err != nil {
		return err
	}
	defer adminPool.Close()

	var exists bool
	err = adminPool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)", dbName).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		_, err = adminPool.Exec(ctx, fmt.Sprintf(`CREATE DATABASE "%s"`, dbName))
		if err != nil {
			return fmt.Errorf("create tenant db: %w", err)
		}
	}

	tenantURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, password, host, port, dbName)
	tenantPool, err := pgxpool.New(ctx, tenantURL)
	if err != nil {
		return err
	}
	defer tenantPool.Close()

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		sql, err := os.ReadFile(filepath.Join(migrationsDir, e.Name()))
		if err != nil {
			return err
		}
		if _, err := tenantPool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("tenant migration %s: %w", e.Name(), err)
		}
	}
	return nil
}

func TenantPool(ctx context.Context, host, port, user, password, dbName string) (*pgxpool.Pool, error) {
	url := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, password, host, port, dbName)
	return pgxpool.New(ctx, url)
}
