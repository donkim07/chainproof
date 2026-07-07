package handlers

import (
	"net/http"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/middleware"
	"github.com/chainproof/baas/internal/services"
	"github.com/gin-gonic/gin"
)

type OrgBillingHandler struct {
	billing  *services.OrgBillingService
	stripe   *services.StripeBillingService
	platform *database.PlatformDB
	platformSvc *services.PlatformService
}

func NewOrgBillingHandler(billing *services.OrgBillingService, stripe *services.StripeBillingService, platform *database.PlatformDB) *OrgBillingHandler {
	return &OrgBillingHandler{
		billing: billing, stripe: stripe, platform: platform,
		platformSvc: services.NewPlatformService(platform),
	}
}

func (h *OrgBillingHandler) Overview(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	ov, err := h.billing.Overview(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ov)
}

func (h *OrgBillingHandler) Invoices(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	inv, err := h.billing.ListInvoices(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, inv)
}

func (h *OrgBillingHandler) CreateCheckout(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	var body struct {
		PlanSlug string `json:"plan_slug" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.stripe.CreateCheckout(c.Request.Context(), slug, body.PlanSlug)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if claims := middleware.GetClaims(c); claims != nil {
		actorID := claims.UserID
		h.platformSvc.WriteAudit(c.Request.Context(), &actorID, "billing.checkout_attempt", "organization", slug, map[string]interface{}{
			"plan_slug": body.PlanSlug,
			"status":    result.Error,
		}, c.ClientIP())
	}
	if result.Error == "stripe_not_configured" {
		c.JSON(http.StatusServiceUnavailable, result)
		return
	}
	if result.CheckoutURL != "" {
		c.JSON(http.StatusOK, result)
		return
	}
	c.JSON(http.StatusServiceUnavailable, result)
}

func (h *OrgBillingHandler) ChangePlan(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":   "plan_changes_disabled",
		"message": "Plan changes require payment. Use the upgrade flow in Billing.",
	})
}
