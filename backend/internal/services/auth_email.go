package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/chainproof/baas/internal/auth"
	"github.com/jackc/pgx/v5"
)

func (s *AuthService) token() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *AuthService) SendVerificationEmail(ctx context.Context, userID string) error {
	tok, err := s.token()
	if err != nil {
		return err
	}
	var email, name string
	err = s.db.Pool.QueryRow(ctx, `
		UPDATE platform_users SET verification_token = $1, verification_sent_at = NOW()
		WHERE id = $2 AND email_verified = false
		RETURNING email, full_name`, tok, userID).Scan(&email, &name)
	if err != nil {
		return err
	}
	link := fmt.Sprintf("%s/verify-email?token=%s", s.cfg.AppURL, tok)
	body := fmt.Sprintf(`<p>Hi %s,</p><p>Please verify your email within 4 days to keep full access to ChainProof.</p>`, name)
	mail := NewEmailService(s.cfg)
	return mail.Send(email, "Verify your ChainProof email", EmailTemplate("Verify your email", body, "Verify email", link))
}

func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	var id string
	var sentAt time.Time
	err := s.db.Pool.QueryRow(ctx, `
		SELECT id::text, COALESCE(verification_sent_at, created_at) FROM platform_users
		WHERE verification_token = $1 AND email_verified = false`, token).Scan(&id, &sentAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("invalid or expired verification link")
		}
		return err
	}
	if time.Since(sentAt) > 96*time.Hour {
		return errors.New("verification link expired — request a new one")
	}
	_, err = s.db.Pool.Exec(ctx, `
		UPDATE platform_users SET email_verified = true, verification_token = NULL WHERE id = $1`, id)
	return err
}

func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	tok, err := s.token()
	if err != nil {
		return err
	}
	exp := time.Now().Add(2 * time.Hour)
	tag, err := s.db.Pool.Exec(ctx, `
		UPDATE platform_users SET reset_token = $1, reset_token_expires_at = $2
		WHERE email = $3 AND active = true`, tok, exp, email)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return nil // don't reveal whether email exists
	}
	link := fmt.Sprintf("%s/reset-password?token=%s", s.cfg.AppURL, tok)
	body := `<p>We received a request to reset your password. This link expires in 2 hours.</p>`
	mail := NewEmailService(s.cfg)
	return mail.Send(email, "Reset your ChainProof password", EmailTemplate("Reset password", body, "Reset password", link))
}

func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	var id string
	var exp *time.Time
	err := s.db.Pool.QueryRow(ctx, `
		SELECT id::text, reset_token_expires_at FROM platform_users
		WHERE reset_token = $1 AND active = true`, token).Scan(&id, &exp)
	if err != nil {
		return errors.New("invalid or expired reset link")
	}
	if exp == nil || time.Now().After(*exp) {
		return errors.New("reset link expired")
	}
	hash, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}
	_, err = s.db.Pool.Exec(ctx, `
		UPDATE platform_users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2`, hash, id)
	return err
}

func (s *AuthService) EmailVerificationStatus(ctx context.Context, userID string) (bool, time.Time, error) {
	var verified bool
	var created time.Time
	err := s.db.Pool.QueryRow(ctx, `
		SELECT email_verified, created_at FROM platform_users WHERE id = $1`, userID).Scan(&verified, &created)
	return verified, created, err
}
