package services

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/chainproof/baas/internal/models"
	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
)

type NotificationService struct {
	tenant *tenant.Resolver
	client *http.Client
}

func NewNotificationService(t *tenant.Resolver) *NotificationService {
	return &NotificationService{
		tenant: t,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *NotificationService) ListChannels(ctx context.Context, orgSlug string) ([]models.NotificationChannel, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	rows, err := pool.Query(ctx, `
		SELECT id, name, channel_type, config, events, active, created_at
		FROM notification_channels ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.NotificationChannel
	for rows.Next() {
		var (
			n          models.NotificationChannel
			configJSON []byte
		)
		if err := rows.Scan(&n.ID, &n.Name, &n.ChannelType, &configJSON, &n.Events, &n.Active, &n.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(configJSON, &n.Config)
		out = append(out, n)
	}
	return out, nil
}

func (s *NotificationService) UpsertChannel(ctx context.Context, orgSlug string, body models.NotificationChannel) (*models.NotificationChannel, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	if body.ID == uuid.Nil {
		body.ID = uuid.New()
	}
	if len(body.Events) == 0 {
		body.Events = []string{"tamper_detected"}
	}
	cfg, _ := json.Marshal(body.Config)
	_, err = pool.Exec(ctx, `
		INSERT INTO notification_channels (id, name, channel_type, config, events, active)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			channel_type = EXCLUDED.channel_type,
			config = EXCLUDED.config,
			events = EXCLUDED.events,
			active = EXCLUDED.active`,
		body.ID, body.Name, body.ChannelType, cfg, body.Events, body.Active)
	if err != nil {
		return nil, err
	}
	return &body, nil
}

func (s *NotificationService) DeleteChannel(ctx context.Context, orgSlug string, channelID uuid.UUID) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `DELETE FROM notification_channels WHERE id = $1`, channelID)
	return err
}

func (s *NotificationService) TriggerIncident(ctx context.Context, orgSlug string, incident map[string]interface{}) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	rows, err := pool.Query(ctx, `
		SELECT id, channel_type, config
		FROM notification_channels
		WHERE active = true AND (events @> ARRAY['tamper_detected']::text[])`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var id uuid.UUID
		var typ string
		var cfgJSON []byte
		if err := rows.Scan(&id, &typ, &cfgJSON); err != nil {
			continue
		}
		cfg := map[string]interface{}{}
		_ = json.Unmarshal(cfgJSON, &cfg)
		if typ == "webhook" {
			if url, ok := cfg["url"].(string); ok && url != "" {
				b, _ := json.Marshal(incident)
				req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
				req.Header.Set("Content-Type", "application/json")
				resp, err := s.client.Do(req)
				if err != nil {
					continue
				}
				resp.Body.Close()
			}
		}
	}
	return nil
}
