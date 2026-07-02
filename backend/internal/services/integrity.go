package services

import (
	"context"
	"fmt"
	"time"

	"github.com/chainproof/baas/internal/blockchain"
	"github.com/chainproof/baas/internal/hashutil"
	"github.com/chainproof/baas/internal/models"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
)

type IntegrityService struct {
	tenant   *tenant.Resolver
	fabric   *blockchain.Client
}

func NewIntegrityService(t *tenant.Resolver, fabric *blockchain.Client) *IntegrityService {
	return &IntegrityService{tenant: t, fabric: fabric}
}

func (s *IntegrityService) Anchor(ctx context.Context, orgSlug, actorID string, req models.AnchorRequest) (*models.IntegrityRecord, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	payloadHash, err := hashutil.CanonicalHash(req.Payload)
	if err != nil {
		return nil, err
	}
	recordHash := hashutil.RecordHash(req.EntityType, req.EntityID, payloadHash, req.PreviousRecordHash)

	var siteID *uuid.UUID
	if req.SiteID != "" {
		id, err := uuid.Parse(req.SiteID)
		if err == nil {
			siteID = &id
		}
	}

	rec := models.IntegrityRecord{
		ID: uuid.New(), EntityType: req.EntityType, EntityID: req.EntityID,
		PayloadHash: payloadHash, RecordHash: recordHash, BlockchainStatus: "pending",
		CreatedAt: time.Now(),
	}
	if siteID != nil {
		rec.SiteID = siteID
	}
	if req.TableName != "" {
		rec.TableName = &req.TableName
	}
	if req.PreviousRecordHash != "" {
		rec.PreviousRecordHash = &req.PreviousRecordHash
	}

	anchorResult, anchorErr := s.fabric.Anchor(ctx, blockchain.AnchorPayload{
		EntityType: req.EntityType, EntityUID: req.EntityID, Action: "ANCHOR",
		ActorUID: actorID, PayloadHash: payloadHash, RecordHash: recordHash,
		PreviousRecordHash: req.PreviousRecordHash, TenantID: orgSlug,
	})

	status := "submitted"
	var txID *string
	var anchoredAt *time.Time
	if anchorErr != nil {
		status = "failed"
	} else if anchorResult != nil && anchorResult.TxID != "" {
		txID = &anchorResult.TxID
		now := time.Now()
		anchoredAt = &now
	}

	rec.BlockchainStatus = status
	rec.BlockchainTxID = txID
	rec.AnchoredAt = anchoredAt

	_, err = pool.Exec(ctx, `
		INSERT INTO integrity_records
		(id, site_id, entity_type, entity_id, table_name, payload_hash, record_hash,
		 previous_record_hash, blockchain_tx_id, blockchain_status, anchored_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (entity_type, entity_id, record_hash) DO UPDATE SET
			blockchain_tx_id = EXCLUDED.blockchain_tx_id,
			blockchain_status = EXCLUDED.blockchain_status,
			anchored_at = EXCLUDED.anchored_at`,
		rec.ID, rec.SiteID, rec.EntityType, rec.EntityID, rec.TableName,
		rec.PayloadHash, rec.RecordHash, rec.PreviousRecordHash,
		rec.BlockchainTxID, rec.BlockchainStatus, rec.AnchoredAt)
	if err != nil {
		return nil, err
	}

	return &rec, nil
}

func (s *IntegrityService) Verify(ctx context.Context, orgSlug string, req models.VerifyRequest) (*models.VerifyResponse, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	actualHash, err := hashutil.CanonicalHash(req.Payload)
	if err != nil {
		return nil, err
	}

	var expectedHash, recordHash, txID string
	err = pool.QueryRow(ctx, `
		SELECT payload_hash, record_hash, COALESCE(blockchain_tx_id, '')
		FROM integrity_records
		WHERE entity_type = $1 AND entity_id = $2
		ORDER BY created_at DESC LIMIT 1`,
		req.EntityType, req.EntityID).Scan(&expectedHash, &recordHash, &txID)
	if err != nil {
		return &models.VerifyResponse{
			Intact: false, ActualHash: actualHash,
			Message: "No anchored record found for this entity",
		}, nil
	}

	intact := expectedHash == actualHash
	resp := &models.VerifyResponse{
		Intact: intact, ExpectedHash: expectedHash, ActualHash: actualHash,
	}
	if txID != "" {
		resp.TxID = &txID
	}

	if intact {
		resp.Message = "Record integrity verified — no tampering detected"
	} else {
		resp.Message = "TAMPERING DETECTED — payload hash mismatch"
		_, _ = pool.Exec(ctx, `
			INSERT INTO tamper_incidents
			(entity_type, entity_id, severity, expected_hash, actual_hash, blockchain_tx_id)
			VALUES ($1, $2, 'high', $3, $4, NULLIF($5,''))`,
			req.EntityType, req.EntityID, expectedHash, actualHash, txID)
	}

	return resp, nil
}

func (s *IntegrityService) ListIncidents(ctx context.Context, orgSlug string, limit int) ([]models.TamperIncident, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 50
	}

	rows, err := pool.Query(ctx, `
		SELECT id, integrity_record_id, site_id, entity_type, entity_id, table_name,
		       severity, expected_hash, actual_hash, blockchain_tx_id, detected_at,
		       investigation_status, attribution
		FROM tamper_incidents ORDER BY detected_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var incidents []models.TamperIncident
	for rows.Next() {
		var inc models.TamperIncident
		if err := rows.Scan(&inc.ID, &inc.IntegrityRecordID, &inc.SiteID,
			&inc.EntityType, &inc.EntityID, &inc.TableName, &inc.Severity,
			&inc.ExpectedHash, &inc.ActualHash, &inc.BlockchainTxID, &inc.DetectedAt,
			&inc.InvestigationStatus, &inc.Attribution); err != nil {
			return nil, err
		}
		incidents = append(incidents, inc)
	}
	return incidents, nil
}

func (s *IntegrityService) DashboardStats(ctx context.Context, orgSlug string) (*models.DashboardStats, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}

	stats := &models.DashboardStats{}
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM sites`).Scan(&stats.TotalSites)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM protected_endpoints WHERE enabled = true`).Scan(&stats.ProtectedEndpoints)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM integrity_records WHERE blockchain_status = 'submitted'`).Scan(&stats.AnchoredRecords)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM tamper_incidents WHERE investigation_status = 'open'`).Scan(&stats.OpenIncidents)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM tamper_incidents`).Scan(&stats.TamperedRecords)
	return stats, nil
}

func (s *IntegrityService) RunMonitor(ctx context.Context, orgSlug string) (int, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return 0, err
	}

	rows, err := pool.Query(ctx, `
		SELECT entity_type, entity_id, payload_hash, record_hash, COALESCE(blockchain_tx_id,'')
		FROM integrity_records WHERE blockchain_status = 'submitted'
		ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	tampered := 0
	for rows.Next() {
		var entityType, entityID, payloadHash, recordHash, txID string
		if err := rows.Scan(&entityType, &entityID, &payloadHash, &recordHash, &txID); err != nil {
			continue
		}
		found, _, _ := s.fabric.Verify(ctx, entityType, entityID, recordHash)
		if !found {
			tampered++
			_, _ = pool.Exec(ctx, `
				INSERT INTO tamper_incidents (entity_type, entity_id, severity, expected_hash, blockchain_tx_id)
				VALUES ($1, $2, 'critical', $3, NULLIF($4,''))
				ON CONFLICT DO NOTHING`, entityType, entityID, recordHash, txID)
		}
	}
	return tampered, nil
}

func (s *IntegrityService) ListRecords(ctx context.Context, orgSlug string, limit int) ([]models.IntegrityRecord, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, fmt.Errorf("tenant pool: %w", err)
	}
	if limit <= 0 {
		limit = 50
	}
	rows, err := pool.Query(ctx, `
		SELECT id, site_id, entity_type, entity_id, table_name, payload_hash, record_hash,
		       previous_record_hash, blockchain_tx_id, blockchain_status, anchored_at, created_at
		FROM integrity_records ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []models.IntegrityRecord
	for rows.Next() {
		var r models.IntegrityRecord
		if err := rows.Scan(&r.ID, &r.SiteID, &r.EntityType, &r.EntityID, &r.TableName,
			&r.PayloadHash, &r.RecordHash, &r.PreviousRecordHash, &r.BlockchainTxID,
			&r.BlockchainStatus, &r.AnchoredAt, &r.CreatedAt); err != nil {
			return nil, err
		}
		records = append(records, r)
	}
	return records, nil
}
