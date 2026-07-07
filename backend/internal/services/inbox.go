package services

import (
	"context"
	"fmt"
	"time"

	"github.com/chainproof/baas/internal/tenant"
	"github.com/google/uuid"
)

type InboxNotification struct {
	ID        uuid.UUID  `json:"id"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	Category  string     `json:"category"`
	Link      string     `json:"link,omitempty"`
	ReadAt    *time.Time `json:"read_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type InboxService struct {
	tenant *tenant.Resolver
}

func NewInboxService(t *tenant.Resolver) *InboxService {
	return &InboxService{tenant: t}
}

func (s *InboxService) List(ctx context.Context, orgSlug, userID string, limit int) ([]InboxNotification, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	rows, err := pool.Query(ctx, `
		SELECT id, title, body, category, COALESCE(link, ''), read_at, created_at
		FROM in_app_notifications
		WHERE user_id = $1 OR user_id IS NULL
		ORDER BY created_at DESC LIMIT $2`, uid, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []InboxNotification
	for rows.Next() {
		var n InboxNotification
		if err := rows.Scan(&n.ID, &n.Title, &n.Body, &n.Category, &n.Link, &n.ReadAt, &n.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, nil
}

func (s *InboxService) UnreadCount(ctx context.Context, orgSlug, userID string) (int, error) {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return 0, err
	}
	uid, err := uuid.Parse(userID)
	if err != nil {
		return 0, err
	}
	var n int
	err = pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM in_app_notifications
		WHERE (user_id = $1 OR user_id IS NULL) AND read_at IS NULL`, uid).Scan(&n)
	return n, err
}

func (s *InboxService) MarkRead(ctx context.Context, orgSlug, userID, notifID string) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	uid, err := uuid.Parse(userID)
	if err != nil {
		return err
	}
	nid, err := uuid.Parse(notifID)
	if err != nil {
		return err
	}
	tag, err := pool.Exec(ctx, `
		UPDATE in_app_notifications SET read_at = NOW()
		WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) AND read_at IS NULL`, nid, uid)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("notification not found")
	}
	return nil
}

func (s *InboxService) Create(ctx context.Context, orgSlug string, userID *uuid.UUID, title, body, category, link string) error {
	pool, _, err := s.tenant.GetPool(ctx, orgSlug)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO in_app_notifications (user_id, title, body, category, link)
		VALUES ($1, $2, $3, $4, $5)`,
		userID, title, body, category, link)
	return err
}
