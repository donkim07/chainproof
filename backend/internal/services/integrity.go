package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/chainproof/baas/internal/blockchain"
	"github.com/chainproof/baas/internal/hashutil"
	"github.com/chainproof/baas/internal/models"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type IntegrityService struct {
	tenant          *tenant.Resolver
	fabric          *blockchain.Client
	fabricChannel   string
	fabricChaincode string
}

func NewIntegrityService(t *tenant.Resolver, fabric *blockchain.Client, fabricChannel, fabricChaincode string) *IntegrityService {
	return &IntegrityService{tenant: t, fabric: fabric, fabricChannel: fabricChannel, fabricChaincode: fabricChaincode}
}

// NetworkStatus reports the real Fabric network reachable behind the gateway
// adapter: one orderer (orderer0), one peer (peer0, CouchDB-backed) — the
// actual deployed solo-node topology, not a simulated one.
func (s *IntegrityService) NetworkStatus(ctx context.Context) models.NetworkStatus {
	status := models.NetworkStatus{
		DevMock:      s.fabric.DevMockEnabled(),
		Channel:      s.fabricChannel,
		Chaincode:    s.fabricChaincode,
		OrdererNodes: []string{"orderer0.chainproof.local"},
		PeerNodes:    []string{"peer0.chainproof.local", "peer1.chainproof.local", "peer2.chainproof.local"},
		CheckedAt:    time.Now(),
	}
	status.GatewayReachable = s.fabric.Health(ctx) == nil
	return status
}

func (s *IntegrityService) Anchor(ctx context.Context, orgSlug, actorID string, req models.AnchorRequest, sites *SiteService, secret string) (*models.IntegrityRecord, error) {
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
	meta := map[string]interface{}{}
	payloadKeys := make([]string, 0, len(req.Payload))
	for k := range req.Payload {
		payloadKeys = append(payloadKeys, k)
	}
	sort.Strings(payloadKeys)
	if len(payloadKeys) > 0 {
		meta["payload_keys"] = payloadKeys
	}
	if req.Verify != nil {
		meta["verify"] = req.Verify
	}
	meta["anchor_payload"] = req.Payload
	if anchorErr != nil {
		status = "failed"
		meta["blockchain_error"] = anchorErr.Error()
	} else if anchorResult != nil {
		if anchorResult.TxID != "" {
			txID = &anchorResult.TxID
		}
		now := time.Now()
		anchoredAt = &now
		if anchorResult.Mock {
			meta["blockchain_mode"] = "dev_mock"
			meta["note"] = "Fabric gateway offline — hash stored locally with dev mock tx id. Start fabric profile for real anchoring."
		}
	}

	rec.BlockchainStatus = status
	rec.BlockchainTxID = txID
	rec.AnchoredAt = anchoredAt

	metaJSON, _ := json.Marshal(meta)
	_, err = pool.Exec(ctx, `
		INSERT INTO integrity_records
		(id, site_id, entity_type, entity_id, table_name, payload_hash, record_hash,
		 previous_record_hash, blockchain_tx_id, blockchain_status, anchored_at, metadata)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		ON CONFLICT (entity_type, entity_id, record_hash) DO UPDATE SET
			blockchain_tx_id = EXCLUDED.blockchain_tx_id,
			blockchain_status = EXCLUDED.blockchain_status,
			anchored_at = EXCLUDED.anchored_at,
			metadata = integrity_records.metadata || EXCLUDED.metadata`,
		rec.ID, rec.SiteID, rec.EntityType, rec.EntityID, rec.TableName,
		rec.PayloadHash, rec.RecordHash, rec.PreviousRecordHash,
		rec.BlockchainTxID, rec.BlockchainStatus, rec.AnchoredAt, metaJSON)
	if err != nil {
		return nil, err
	}

	// Don't make the caller wait on an outbound HTTP round-trip to their own
	// site — verify in the background so tampering (or confirmation of
	// integrity) surfaces within seconds instead of waiting for the next
	// monitor tick.
	if anchorErr == nil && req.Verify != nil && siteID != nil && sites != nil {
		verifyReq := req
		siteIDCopy := *siteID
		go s.verifyImmediately(orgSlug, secret, sites, siteIDCopy, verifyReq)
	}

	return &rec, nil
}

// verifyImmediately re-fetches the site's live data right after an anchor with
// a Verify config, so the first check doesn't wait for the periodic monitor.
func (s *IntegrityService) verifyImmediately(orgSlug, secret string, sites *SiteService, siteID uuid.UUID, req models.AnchorRequest) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return
	}
	var baseURL string
	var settingsJSON []byte
	if err := pool.QueryRow(ctx, `SELECT base_url, settings FROM sites WHERE id = $1`, siteID).
		Scan(&baseURL, &settingsJSON); err != nil {
		return
	}
	var settings map[string]interface{}
	_ = json.Unmarshal(settingsJSON, &settings)

	job := anchoredVerifyJob{
		EntityType: req.EntityType, EntityID: req.EntityID, SiteID: siteID,
		BaseURL: baseURL, Settings: settings, Auth: parseAuthFromSettings(settings, secret),
		Verify: *req.Verify, AnchorPayload: req.Payload,
	}
	if job.Verify.Method == "" {
		job.Verify.Method = "GET"
	}
	s.runAnchoredVerify(ctx, orgSlug, sites, secret, job)
	_ = touchLastVerified(ctx, pool, req.EntityType, req.EntityID)
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
	var siteID *uuid.UUID
	var recordID uuid.UUID
	err = pool.QueryRow(ctx, `
		SELECT id, payload_hash, record_hash, COALESCE(blockchain_tx_id, ''), site_id
		FROM integrity_records
		WHERE entity_type = $1 AND entity_id = $2
		ORDER BY created_at DESC LIMIT 1`,
		req.EntityType, req.EntityID).Scan(&recordID, &expectedHash, &recordHash, &txID, &siteID)
	if err != nil {
		return &models.VerifyResponse{
			Intact: false, HasAnchor: false, ActualHash: actualHash,
			Message: "No anchored record found for this entity",
		}, nil
	}

	intact := expectedHash == actualHash
	resp := &models.VerifyResponse{
		Intact: intact, HasAnchor: true, ExpectedHash: expectedHash, ActualHash: actualHash,
	}
	if txID != "" {
		resp.TxID = &txID
	}

	if intact {
		resp.Message = "Record integrity verified — no tampering detected"
	} else {
		resp.Message = "TAMPERING DETECTED — payload hash mismatch"
		_ = s.recordTamperIncident(ctx, pool, siteID, &recordID, req.EntityType, req.EntityID, expectedHash, &actualHash, txID, "high")
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

	missingOnChain := 0
	for rows.Next() {
		var entityType, entityID, payloadHash, recordHash, txID string
		if err := rows.Scan(&entityType, &entityID, &payloadHash, &recordHash, &txID); err != nil {
			continue
		}
		found, _, err := s.fabric.Verify(ctx, orgSlug, entityType, entityID, recordHash)
		if err != nil || found {
			continue
		}
		missingOnChain++
	}
	// Blockchain reconciliation only — do not create tamper_incidents here.
	// DB tampering is detected exclusively via Verify() when payload hash mismatches.
	return missingOnChain, nil
}

// recordTamperIncident inserts one open incident per entity/hash mismatch (no duplicates).
func (s *IntegrityService) recordTamperIncident(ctx context.Context, pool *pgxpool.Pool, siteID, recordID *uuid.UUID, entityType, entityID, expectedHash string, actualHash *string, txID, severity string) error {
	var exists bool
	err := pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM tamper_incidents
			WHERE entity_type = $1 AND entity_id = $2
			  AND investigation_status = 'open'
			  AND expected_hash = $3
			  AND COALESCE(actual_hash, '') = COALESCE($4, '')
		)`, entityType, entityID, expectedHash, actualHash).Scan(&exists)
	if err != nil || exists {
		return err
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO tamper_incidents
		(site_id, integrity_record_id, entity_type, entity_id, severity, expected_hash, actual_hash, blockchain_tx_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8,''))`,
		siteID, recordID, entityType, entityID, severity, expectedHash, actualHash, txID)
	return err
}

func (s *IntegrityService) RetryFailedAnchors(ctx context.Context, orgSlug string) (int, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return 0, err
	}
	rows, err := pool.Query(ctx, `
		SELECT id, entity_type, entity_id, payload_hash, record_hash, COALESCE(previous_record_hash,'')
		FROM integrity_records WHERE blockchain_status = 'failed'
		ORDER BY created_at DESC LIMIT 20`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	retried := 0
	for rows.Next() {
		var id uuid.UUID
		var entityType, entityID, payloadHash, recordHash, prev string
		if err := rows.Scan(&id, &entityType, &entityID, &payloadHash, &recordHash, &prev); err != nil {
			continue
		}
		result, err := s.fabric.Anchor(ctx, blockchain.AnchorPayload{
			EntityType: entityType, EntityUID: entityID, Action: "ANCHOR",
			PayloadHash: payloadHash, RecordHash: recordHash,
			PreviousRecordHash: prev, TenantID: orgSlug,
		})
		if err != nil {
			continue
		}
		meta := map[string]interface{}{"retried_at": time.Now().Format(time.RFC3339)}
		if result != nil && result.Mock {
			meta["blockchain_mode"] = "dev_mock"
		}
		metaJSON, _ := json.Marshal(meta)
		var txID *string
		now := time.Now()
		if result != nil && result.TxID != "" {
			txID = &result.TxID
		}
		_, _ = pool.Exec(ctx, `
			UPDATE integrity_records SET blockchain_status = 'submitted', blockchain_tx_id = $1,
			anchored_at = $2, metadata = metadata || $3::jsonb WHERE id = $4`,
			txID, now, metaJSON, id)
		retried++
	}
	return retried, nil
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
