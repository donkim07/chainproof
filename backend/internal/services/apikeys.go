package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/models"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
)

type APIKeyAuthResult struct {
	KeyID   uuid.UUID
	OrgSlug string
	Name    string
	Scopes  []string
}

type APIKeyService struct {
	tenant *tenant.Resolver
}

func NewAPIKeyService(t *tenant.Resolver) *APIKeyService {
	return &APIKeyService{tenant: t}
}

func (s *APIKeyService) Create(ctx context.Context, orgSlug, name string, scopes []string, creatorEmail string) (*models.APIKey, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	tenantUserID, err := s.tenant.ResolveTenantUserID(ctx, orgSlug, creatorEmail)
	if err != nil {
		return nil, err
	}

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	plainKey := "cp_" + hex.EncodeToString(raw)
	prefix := plainKey[:12]
	hash := sha256.Sum256([]byte(plainKey))
	keyHash := hex.EncodeToString(hash[:])

	key := models.APIKey{
		ID: uuid.New(), Name: name, KeyPrefix: prefix,
		Scopes: scopes, Active: true, CreatedAt: time.Now(), PlainKey: plainKey,
	}

	var createdBy interface{}
	if tenantUserID != nil {
		createdBy = *tenantUserID
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO api_keys (id, name, key_prefix, key_hash, scopes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		key.ID, key.Name, key.KeyPrefix, keyHash, scopes, createdBy)
	if err != nil {
		return nil, err
	}
	return &key, nil
}

func (s *APIKeyService) List(ctx context.Context, orgSlug string) ([]models.APIKey, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
		SELECT id, name, key_prefix, scopes, last_used_at, expires_at, active, created_at
		FROM api_keys ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []models.APIKey
	for rows.Next() {
		var k models.APIKey
		if err := rows.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.Scopes,
			&k.LastUsedAt, &k.ExpiresAt, &k.Active, &k.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, nil
}

func HasScope(scopes []string, required string) bool {
	if len(scopes) == 0 {
		return true
	}
	for _, s := range scopes {
		if s == required || s == "*" {
			return true
		}
	}
	return false
}

func (s *APIKeyService) ResolveByPlainKey(ctx context.Context, platform *database.PlatformDB, plainKey string) (*APIKeyAuthResult, error) {
	if plainKey == "" || !strings.HasPrefix(plainKey, "cp_") {
		return nil, fmt.Errorf("invalid api key")
	}

	hash := sha256.Sum256([]byte(plainKey))
	keyHash := hex.EncodeToString(hash[:])

	rows, err := platform.Pool.Query(ctx, `SELECT slug FROM organizations WHERE active = true`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			continue
		}
		pool, _, err := s.tenant.GetPool(ctx, slug)
		if err != nil {
			continue
		}
		var result APIKeyAuthResult
		err = pool.QueryRow(ctx, `
			SELECT id, name, scopes FROM api_keys
			WHERE key_hash = $1 AND active = true
			AND (expires_at IS NULL OR expires_at > NOW())`, keyHash).Scan(&result.KeyID, &result.Name, &result.Scopes)
		if err != nil {
			continue
		}
		result.OrgSlug = slug
		_, _ = pool.Exec(ctx, `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, result.KeyID)
		return &result, nil
	}
	return nil, fmt.Errorf("invalid api key")
}

func (s *APIKeyService) Validate(ctx context.Context, orgSlug, plainKey string) (uuid.UUID, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return uuid.Nil, err
	}

	hash := sha256.Sum256([]byte(plainKey))
	keyHash := hex.EncodeToString(hash[:])

	var id uuid.UUID
	err = pool.QueryRow(ctx, `
		SELECT id FROM api_keys WHERE key_hash = $1 AND active = true
		AND (expires_at IS NULL OR expires_at > NOW())`, keyHash).Scan(&id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid api key")
	}

	_, _ = pool.Exec(ctx, `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, id)
	return id, nil
}

func (s *APIKeyService) Revoke(ctx context.Context, orgSlug string, keyID uuid.UUID) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `UPDATE api_keys SET active = false WHERE id = $1`, keyID)
	return err
}
