package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strings"

	"github.com/chainproof/baas/internal/models"
	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

var safeSQLIdent = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

type tamperSiteConfig struct {
	SiteID          uuid.UUID
	BaseURL         string
	Auth            SiteAuthSettings
	TamperScan      bool
	SQLitePath      string
	SQLiteTable     string
	SQLiteIDColumn  string
	RecordFetchPath string
}

type scanRecord struct {
	EntityType  string
	EntityID    string
	SiteID      *uuid.UUID
	TableName   *string
	PayloadKeys []string
}

func parseTamperSiteConfig(siteID uuid.UUID, baseURL string, settings map[string]interface{}, secret string) tamperSiteConfig {
	auth := parseAuthFromSettings(settings, secret)
	cfg := tamperSiteConfig{
		SiteID:          siteID,
		BaseURL:         baseURL,
		Auth:            auth,
		TamperScan:      boolVal(settings["tamper_scan_enabled"]),
		SQLitePath:      strVal(settings["sqlite_path"], ""),
		SQLiteTable:     strVal(settings["sqlite_table"], ""),
		SQLiteIDColumn:  strVal(settings["sqlite_id_column"], "id"),
		RecordFetchPath: strVal(settings["record_fetch_path"], ""),
	}
	if cfg.SQLitePath != "" && !cfg.TamperScan {
		cfg.TamperScan = true
	}
	if cfg.RecordFetchPath != "" && !cfg.TamperScan {
		cfg.TamperScan = true
	}
	if cfg.SQLiteTable == "" {
		cfg.SQLiteTable = "chat_history"
	}
	return cfg
}

func (s *IntegrityService) RunTamperDetect(ctx context.Context, orgSlug string, sites *SiteService, secret string) (int, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return 0, err
	}

	siteRows, err := pool.Query(ctx, `SELECT id, base_url, settings FROM sites WHERE status = 'active'`)
	if err != nil {
		return 0, err
	}
	defer siteRows.Close()

	siteConfigs := map[uuid.UUID]tamperSiteConfig{}
	var fallback *tamperSiteConfig
	for siteRows.Next() {
		var siteID uuid.UUID
		var baseURL string
		var settingsJSON []byte
		if err := siteRows.Scan(&siteID, &baseURL, &settingsJSON); err != nil {
			continue
		}
		settings := map[string]interface{}{}
		_ = json.Unmarshal(settingsJSON, &settings)
		cfg := parseTamperSiteConfig(siteID, baseURL, settings, secret)
		if !cfg.TamperScan {
			continue
		}
		siteConfigs[siteID] = cfg
		if fallback == nil && (cfg.SQLitePath != "" || cfg.RecordFetchPath != "") {
			c := cfg
			fallback = &c
		}
	}
	if len(siteConfigs) == 0 {
		return 0, nil
	}

	recRows, err := pool.Query(ctx, `
		SELECT entity_type, entity_id, site_id, table_name, metadata
		FROM integrity_records
		WHERE blockchain_status = 'submitted'
		ORDER BY created_at DESC
		LIMIT 500`)
	if err != nil {
		return 0, err
	}
	defer recRows.Close()

	detected := 0
	for recRows.Next() {
		var rec scanRecord
		var siteID *uuid.UUID
		var metaJSON []byte
		if err := recRows.Scan(&rec.EntityType, &rec.EntityID, &siteID, &rec.TableName, &metaJSON); err != nil {
			continue
		}
		rec.SiteID = siteID
		rec.PayloadKeys = payloadKeysFromMetadata(metaJSON)

		cfg, ok := resolveTamperConfig(rec, siteConfigs, fallback)
		if !ok {
			continue
		}

		payload, err := fetchCurrentPayload(ctx, sites, cfg, rec)
		if err != nil || payload == nil {
			continue
		}

		resp, err := s.Verify(ctx, orgSlug, models.VerifyRequest{
			EntityType: rec.EntityType,
			EntityID:   rec.EntityID,
			Payload:    payload,
		})
		if err != nil || resp.Intact {
			continue
		}
		detected++
	}
	return detected, nil
}

func payloadKeysFromMetadata(metaJSON []byte) []string {
	if len(metaJSON) == 0 {
		return nil
	}
	var meta map[string]interface{}
	if json.Unmarshal(metaJSON, &meta) != nil {
		return nil
	}
	raw, ok := meta["payload_keys"]
	if !ok {
		return nil
	}
	switch keys := raw.(type) {
	case []interface{}:
		out := make([]string, 0, len(keys))
		for _, k := range keys {
			if s, ok := k.(string); ok && s != "" {
				out = append(out, s)
			}
		}
		sort.Strings(out)
		return out
	case []string:
		sort.Strings(keys)
		return keys
	default:
		return nil
	}
}

func resolveTamperConfig(rec scanRecord, configs map[uuid.UUID]tamperSiteConfig, fallback *tamperSiteConfig) (tamperSiteConfig, bool) {
	if rec.SiteID != nil {
		if cfg, ok := configs[*rec.SiteID]; ok {
			return cfg, true
		}
	}
	if fallback != nil {
		return *fallback, true
	}
	return tamperSiteConfig{}, false
}

func fetchCurrentPayload(ctx context.Context, sites *SiteService, cfg tamperSiteConfig, rec scanRecord) (map[string]interface{}, error) {
	if cfg.SQLitePath != "" {
		table := cfg.SQLiteTable
		if rec.TableName != nil && *rec.TableName != "" {
			table = *rec.TableName
		}
		return fetchSQLitePayload(cfg.SQLitePath, table, cfg.SQLiteIDColumn, rec.EntityID, rec.PayloadKeys)
	}
	if cfg.RecordFetchPath != "" {
		return fetchHTTPPayload(ctx, sites, cfg, rec.EntityType, rec.EntityID)
	}
	return nil, fmt.Errorf("no tamper scan source configured")
}

func fetchSQLitePayload(dbPath, table, idColumn, entityID string, payloadKeys []string) (map[string]interface{}, error) {
	if !strings.HasSuffix(strings.ToLower(dbPath), ".db") {
		return nil, fmt.Errorf("sqlite_path must end with .db")
	}
	if !safeSQLIdent.MatchString(table) || !safeSQLIdent.MatchString(idColumn) {
		return nil, fmt.Errorf("invalid sqlite table or id column")
	}

	db, err := sql.Open("sqlite", dbPath+"?mode=ro")
	if err != nil {
		return nil, err
	}
	defer db.Close()

	columns, err := sqliteColumns(db, table, idColumn, payloadKeys)
	if err != nil {
		return nil, err
	}
	if len(columns) == 0 {
		return nil, fmt.Errorf("no columns to scan")
	}

	selectCols := make([]string, len(columns))
	for i, col := range columns {
		selectCols[i] = quoteIdent(col)
	}
	query := fmt.Sprintf("SELECT %s FROM %s WHERE %s = ? LIMIT 1",
		strings.Join(selectCols, ", "), quoteIdent(table), quoteIdent(idColumn))

	rows, err := db.Query(query, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, fmt.Errorf("record not found in sqlite")
	}

	raw := make([]interface{}, len(columns))
	ptrs := make([]interface{}, len(columns))
	for i := range raw {
		ptrs[i] = &raw[i]
	}
	if err := rows.Scan(ptrs...); err != nil {
		return nil, err
	}

	payload := make(map[string]interface{}, len(columns))
	for i, col := range columns {
		payload[col] = normalizeSQLiteValue(raw[i])
	}
	return payload, nil
}

func sqliteColumns(db *sql.DB, table, idColumn string, payloadKeys []string) ([]string, error) {
	if len(payloadKeys) > 0 {
		for _, col := range payloadKeys {
			if !safeSQLIdent.MatchString(col) {
				return nil, fmt.Errorf("invalid payload column %q", col)
			}
		}
		return payloadKeys, nil
	}

	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", quoteIdent(table)))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
			continue
		}
		if name == idColumn {
			continue
		}
		if safeSQLIdent.MatchString(name) {
			columns = append(columns, name)
		}
	}
	sort.Strings(columns)
	return columns, nil
}

func quoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func normalizeSQLiteValue(v interface{}) interface{} {
	switch val := v.(type) {
	case nil:
		return nil
	case []byte:
		s := string(val)
		if s == "true" || s == "false" {
			return s == "true"
		}
		return s
	case int64:
		return val
	case float64:
		return val
	case string:
		return val
	default:
		return fmt.Sprintf("%v", val)
	}
}

func fetchHTTPPayload(ctx context.Context, sites *SiteService, cfg tamperSiteConfig, entityType, entityID string) (map[string]interface{}, error) {
	path := cfg.RecordFetchPath
	path = strings.ReplaceAll(path, "{entity_type}", entityType)
	path = strings.ReplaceAll(path, "{entity_id}", entityID)
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	url := strings.TrimRight(cfg.BaseURL, "/") + path

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	sites.ApplyAuthHeaders(req, cfg.Auth)

	resp, err := sites.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 65536))
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("fetch returned %d", resp.StatusCode)
	}

	var parsed map[string]interface{}
	if json.Unmarshal(body, &parsed) != nil {
		return nil, fmt.Errorf("invalid json response")
	}
	if payload, ok := parsed["payload"].(map[string]interface{}); ok {
		return payload, nil
	}
	return parsed, nil
}
