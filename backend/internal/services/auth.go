package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/chainproof/baas/internal/auth"
	"github.com/chainproof/baas/internal/config"
	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type AuthService struct {
	db               *database.PlatformDB
	jwt              *auth.JWTService
	cfg              *config.Config
	tenantMigrations string
}

func NewAuthService(db *database.PlatformDB, jwt *auth.JWTService, cfg *config.Config, tenantMigrations string) *AuthService {
	return &AuthService{db: db, jwt: jwt, cfg: cfg, tenantMigrations: tenantMigrations}
}

func (s *AuthService) Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, error) {
	slug := database.Slugify(req.OrgName)
	dbName := database.TenantDBName(slug)

	var exists bool
	_ = s.db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM organizations WHERE slug = $1)`, slug).Scan(&exists)
	if exists {
		slug = slug + "-" + uuid.New().String()[:8]
		dbName = database.TenantDBName(slug)
	}

	var planID uuid.UUID
	err := s.db.Pool.QueryRow(ctx, `SELECT id FROM plans WHERE slug = 'free' LIMIT 1`).Scan(&planID)
	if err != nil {
		return nil, fmt.Errorf("plan lookup: %w", err)
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	tx, err := s.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var orgID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO organizations (name, slug, db_name, plan_id)
		VALUES ($1, $2, $3, $4) RETURNING id`,
		req.OrgName, slug, dbName, planID).Scan(&orgID)
	if err != nil {
		return nil, fmt.Errorf("create org: %w", err)
	}

	var userID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO platform_users (email, password_hash, full_name, role, organization_id)
		VALUES ($1, $2, $3, 'owner', $4) RETURNING id`,
		req.Email, hash, req.FullName, orgID).Scan(&userID)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if err := s.db.ProvisionTenantDB(ctx, s.cfg.TenantDBHost, s.cfg.TenantDBPort,
		s.cfg.TenantDBUser, s.cfg.TenantDBPassword, dbName, s.tenantMigrations); err != nil {
		return nil, fmt.Errorf("provision tenant db: %w", err)
	}

	_ = s.SendVerificationEmail(ctx, userID.String())

	tenantPool, err := database.TenantPool(ctx, s.cfg.TenantDBHost, s.cfg.TenantDBPort,
		s.cfg.TenantDBUser, s.cfg.TenantDBPassword, dbName)
	if err == nil {
		ownerHash, _ := auth.HashPassword(req.Password)
		_, _ = tenantPool.Exec(ctx, `
			INSERT INTO users (id, email, password_hash, full_name)
			VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name`,
			userID, req.Email, ownerHash, req.FullName)
		var adminRoleID uuid.UUID
		_ = tenantPool.QueryRow(ctx, `SELECT id FROM roles WHERE name = 'admin'`).Scan(&adminRoleID)
		_, _ = tenantPool.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			userID, adminRoleID)
		tenantPool.Close()
	}

	token, expires, err := s.jwt.Generate(userID, req.Email, "owner", &orgID, slug)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		Token:     token,
		ExpiresAt: expires,
		User: models.PlatformUser{
			ID: userID, Email: req.Email, FullName: req.FullName,
			Role: "owner", OrganizationID: &orgID, OrgName: req.OrgName, OrgSlug: slug,
		},
		Organization: &models.Organization{
			ID: orgID, Name: req.OrgName, Slug: slug, PlanID: planID,
			PlanSlug: "free", SubscriptionStatus: "active", Active: true,
		},
	}, nil
}

func (s *AuthService) Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error) {
	var user models.PlatformUser
	var hash string
	var orgID *uuid.UUID
	var orgName, orgSlug, planSlug string
	var planID uuid.UUID
	var subStatus string

	err := s.db.Pool.QueryRow(ctx, `
		SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.organization_id,
		       COALESCE(o.name, ''), COALESCE(o.slug, ''), COALESCE(o.plan_id, '00000000-0000-0000-0000-000000000000'),
		       COALESCE(p.slug, ''), COALESCE(o.subscription_status, '')
		FROM platform_users u
		LEFT JOIN organizations o ON o.id = u.organization_id
		LEFT JOIN plans p ON p.id = o.plan_id
		WHERE u.email = $1 AND u.active = true`,
		req.Email).Scan(&user.ID, &user.Email, &hash, &user.FullName, &user.Role,
		&orgID, &orgName, &orgSlug, &planID, &planSlug, &subStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}

	if !auth.CheckPassword(hash, req.Password) {
		return nil, errors.New("invalid credentials")
	}

	_, _ = s.db.Pool.Exec(ctx, `UPDATE platform_users SET last_login_at = $1 WHERE id = $2`, time.Now(), user.ID)

	token, expires, err := s.jwt.Generate(user.ID, user.Email, user.Role, orgID, orgSlug)
	if err != nil {
		return nil, err
	}

	user.OrganizationID = orgID
	user.OrgName = orgName
	user.OrgSlug = orgSlug

	var org *models.Organization
	if orgID != nil {
		org = &models.Organization{
			ID: *orgID, Name: orgName, Slug: orgSlug, PlanID: planID,
			PlanSlug: planSlug, SubscriptionStatus: subStatus, Active: true,
		}
	}

	return &models.AuthResponse{Token: token, ExpiresAt: expires, User: user, Organization: org}, nil
}

func (s *AuthService) SeedSuperAdmin(ctx context.Context) error {
	var exists bool
	_ = s.db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM platform_users WHERE role = 'super_admin')`).Scan(&exists)
	if exists {
		return nil
	}
	hash, err := auth.HashPassword(s.cfg.SeedAdminPassword)
	if err != nil {
		return err
	}
	_, err = s.db.Pool.Exec(ctx, `
		INSERT INTO platform_users (email, password_hash, full_name, role)
		VALUES ($1, $2, 'Super Admin', 'super_admin')`,
		s.cfg.SeedAdminEmail, hash)
	return err
}

func (s *AuthService) Me(ctx context.Context, userID uuid.UUID) (*models.PlatformUser, error) {
	var user models.PlatformUser
	var orgName, orgSlug string
	err := s.db.Pool.QueryRow(ctx, `
		SELECT u.id, u.email, u.full_name, u.role, u.organization_id,
		       COALESCE(o.name, ''), COALESCE(o.slug, ''), u.email_verified
		FROM platform_users u
		LEFT JOIN organizations o ON o.id = u.organization_id
		WHERE u.id = $1`, userID).Scan(&user.ID, &user.Email, &user.FullName, &user.Role,
		&user.OrganizationID, &orgName, &orgSlug, &user.EmailVerified)
	if err != nil {
		return nil, err
	}
	user.OrgName = orgName
	user.OrgSlug = orgSlug
	return &user, nil
}
