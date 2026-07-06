package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/chainproof/baas/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

const defaultVerifyBatchSize = 200

type anchoredVerifyJob struct {
	EntityType    string
	EntityID      string
	SiteID        uuid.UUID
	BaseURL       string
	Settings      map[string]interface{}
	Auth          SiteAuthSettings
	Verify        models.VerifyConfig
	AnchorPayload map[string]interface{}
}

// VerifyAnchoredRecords re-fetches live data for records that include verify metadata
// (set by the developer in POST /integrity/anchor). Processes a rotating batch each cycle.
func (s *IntegrityService) VerifyAnchoredRecords(ctx context.Context, orgSlug string, sites *SiteService, secret string, batchSize int) (PollStats, error) {
	stats := PollStats{}
	if batchSize <= 0 {
		batchSize = defaultVerifyBatchSize
	}
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return stats, err
	}

	rows, err := pool.Query(ctx, `
		SELECT ir.entity_type, ir.entity_id, ir.site_id, ir.metadata,
		       s.base_url, s.settings
		FROM integrity_records ir
		JOIN sites s ON s.id = ir.site_id
		WHERE ir.blockchain_status = 'submitted'
		  AND ir.site_id IS NOT NULL
		  AND ir.metadata ? 'verify'
		ORDER BY COALESCE(ir.metadata->>'last_verified_at', ir.created_at::text) ASC
		LIMIT $1`, batchSize)
	if err != nil {
		return stats, err
	}
	defer rows.Close()

	for rows.Next() {
		var job anchoredVerifyJob
		var siteID uuid.UUID
		var metaJSON, settingsJSON []byte
		if err := rows.Scan(&job.EntityType, &job.EntityID, &siteID, &metaJSON, &job.BaseURL, &settingsJSON); err != nil {
			continue
		}
		job.SiteID = siteID
		_ = json.Unmarshal(settingsJSON, &job.Settings)
		job.Auth = parseAuthFromSettings(job.Settings, secret)

		var meta map[string]interface{}
		if json.Unmarshal(metaJSON, &meta) != nil {
			continue
		}
		rawVerify, ok := meta["verify"]
		if !ok {
			continue
		}
		b, _ := json.Marshal(rawVerify)
		if json.Unmarshal(b, &job.Verify) != nil || job.Verify.PathTemplate == "" {
			continue
		}
		if job.Verify.Method == "" {
			job.Verify.Method = "GET"
		}
		if raw, ok := meta["anchor_payload"].(map[string]interface{}); ok {
			job.AnchorPayload = raw
		}

		verified, tampered, skip := s.runAnchoredVerify(ctx, orgSlug, sites, secret, job)
		_ = touchLastVerified(ctx, pool, job.EntityType, job.EntityID)
		if skip {
			continue
		}
		if verified {
			stats.Verified++
		}
		if tampered {
			stats.Tampered++
		}
	}
	return stats, nil
}

func (s *IntegrityService) runAnchoredVerify(ctx context.Context, orgSlug string, sites *SiteService, secret string, job anchoredVerifyJob) (verified, tampered, skip bool) {
	params := ResolvePathParamRefs(job.Verify.PathParams, job.EntityID, job.AnchorPayload)
	path := ResolvePathTemplate(job.Verify.PathTemplate, params)
	if pathHasTemplate(path) {
		return false, false, true
	}

	status, respBody, err := sites.invokeEndpoint(ctx, orgSlug, secret, job.SiteID, job.BaseURL, job.Settings, job.Auth, job.Verify.Method, path, job.Verify.RequestBody)
	if err != nil || status == 0 || status == 401 || status == 403 {
		return false, false, true
	}

	payload, err := payloadFromHTTP(job.Verify.PayloadFrom, job.Verify.RequestBody, respBody)
	if err != nil {
		return false, false, true
	}

	resp, err := s.Verify(ctx, orgSlug, models.VerifyRequest{
		EntityType: job.EntityType,
		EntityID:   job.EntityID,
		Payload:    payload,
	})
	if err != nil || !resp.HasAnchor {
		return false, false, true
	}
	if resp.Intact {
		return true, false, false
	}
	return false, true, false
}

func payloadFromHTTP(mode, reqBody, respBody string) (map[string]interface{}, error) {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "", "response":
		var parsed interface{}
		if json.Unmarshal([]byte(respBody), &parsed) == nil {
			switch v := parsed.(type) {
			case map[string]interface{}:
				return v, nil
			default:
				return map[string]interface{}{"data": v}, nil
			}
		}
		return map[string]interface{}{"body": respBody}, nil
	case "http":
		return BuildIntegrityPayload(reqBody, respBody), nil
	default:
		return nil, fmt.Errorf("unknown payload_from: %s", mode)
	}
}

func touchLastVerified(ctx context.Context, pool *pgxpool.Pool, entityType, entityID string) error {
	_, err := pool.Exec(ctx, `
		UPDATE integrity_records
		SET metadata = metadata || jsonb_build_object('last_verified_at', to_jsonb(NOW()::text))
		WHERE id = (
			SELECT id FROM integrity_records
			WHERE entity_type = $1 AND entity_id = $2
			ORDER BY created_at DESC LIMIT 1
		)`, entityType, entityID)
	return err
}
