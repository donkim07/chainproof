package services

import (
	"context"
	"encoding/json"
	"time"

	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
)

type AttributionService struct {
	tenant *tenant.Resolver
}

func NewAttributionService(t *tenant.Resolver) *AttributionService {
	return &AttributionService{tenant: t}
}

func (s *AttributionService) InvestigateIncident(ctx context.Context, orgSlug string, incidentID uuid.UUID) (map[string]interface{}, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	var (
		tableName string
		recordID  string
		detected  time.Time
	)
	err = pool.QueryRow(ctx, `
		SELECT COALESCE(table_name,''), entity_id, detected_at
		FROM tamper_incidents WHERE id = $1`, incidentID).
		Scan(&tableName, &recordID, &detected)
	if err != nil {
		return nil, err
	}

	type event struct {
		DBUser    string    `json:"db_user"`
		ClientIP  string    `json:"client_ip"`
		Hostname  string    `json:"hostname"`
		App       string    `json:"application"`
		SQL       string    `json:"sql_statement"`
		ChangedAt time.Time `json:"changed_at"`
		Operation string    `json:"operation"`
	}
	var e event
	_ = pool.QueryRow(ctx, `
		SELECT COALESCE(db_user,''), COALESCE(client_ip,''), COALESCE(hostname,''), COALESCE(application,''),
		       COALESCE(sql_statement,''), changed_at, operation
		FROM db_change_log
		WHERE ($1 = '' OR table_name = $1) AND record_id = $2
		  AND changed_at BETWEEN $3 - INTERVAL '24 hours' AND $3 + INTERVAL '10 minutes'
		ORDER BY changed_at DESC
		LIMIT 1`, tableName, recordID, detected).
		Scan(&e.DBUser, &e.ClientIP, &e.Hostname, &e.App, &e.SQL, &e.ChangedAt, &e.Operation)

	attribution := map[string]interface{}{
		"database":      "PostgreSQL",
		"table":         tableName,
		"record_id":     recordID,
		"user":          e.DBUser,
		"client_ip":     e.ClientIP,
		"hostname":      e.Hostname,
		"application":   e.App,
		"sql_statement": e.SQL,
		"timestamp":     e.ChangedAt,
		"operation":     e.Operation,
		"confidence":    confidence(e.SQL, e.DBUser, e.ClientIP, e.ChangedAt, detected),
	}
	jsonAttr, _ := json.Marshal(attribution)
	_, _ = pool.Exec(ctx, `
		UPDATE tamper_incidents
		SET attribution = $2::jsonb, investigation_status = 'investigated'
		WHERE id = $1`, incidentID, string(jsonAttr))
	return attribution, nil
}

func confidence(sql, dbUser, clientIP string, changedAt, detected time.Time) string {
	if sql != "" && !changedAt.IsZero() && detected.Sub(changedAt) < 10*time.Minute {
		return "High"
	}
	if dbUser != "" || clientIP != "" {
		return "Medium"
	}
	return "Low"
}
