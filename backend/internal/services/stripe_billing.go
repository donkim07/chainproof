package services

import (
	"context"
	"fmt"

	"github.com/chainproof/baas/internal/config"
	"github.com/chainproof/baas/internal/database"
)

type StripeBillingService struct {
	cfg      *config.Config
	platform *database.PlatformDB
}

func NewStripeBillingService(cfg *config.Config, platform *database.PlatformDB) *StripeBillingService {
	return &StripeBillingService{cfg: cfg, platform: platform}
}

type CheckoutResult struct {
	CheckoutURL string  `json:"checkout_url,omitempty"`
	PlanSlug    string  `json:"plan_slug,omitempty"`
	PlanName    string  `json:"plan_name,omitempty"`
	Amount      float64 `json:"amount,omitempty"`
	Error       string  `json:"error,omitempty"`
	Message     string  `json:"message,omitempty"`
}

func (s *StripeBillingService) CreateCheckout(ctx context.Context, orgSlug, planSlug string) (*CheckoutResult, error) {
	if planSlug == "" {
		return nil, fmt.Errorf("plan_slug required")
	}
	var name string
	var price float64
	_ = s.platform.Pool.QueryRow(ctx,
		`SELECT name, price_monthly FROM plans WHERE slug = $1 AND active = true`, planSlug).
		Scan(&name, &price)

	if s.cfg.StripeSecretKey == "" {
		return &CheckoutResult{
			Error:    "stripe_not_configured",
			Message:  "Stripe is not configured on this server. Add STRIPE_SECRET_KEY to enable payments.",
			PlanSlug: planSlug,
			PlanName: name,
			Amount:   price,
		}, nil
	}
	// Stripe integration placeholder — wire Stripe Checkout Session here when keys are set.
	return &CheckoutResult{
		Error:    "stripe_not_configured",
		Message:  "Stripe SDK integration pending — configure STRIPE_SECRET_KEY first.",
		PlanSlug: planSlug,
		PlanName: name,
		Amount:   price,
	}, nil
}
