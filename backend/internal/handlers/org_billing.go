package handlers

import (
	"net/http"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/services"
	"github.com/gin-gonic/gin"
)

type OrgBillingHandler struct {
	billing  *services.OrgBillingService
	platform *database.PlatformDB
}

func NewOrgBillingHandler(billing *services.OrgBillingService, platform *database.PlatformDB) *OrgBillingHandler {
	return &OrgBillingHandler{billing: billing, platform: platform}
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

func (h *OrgBillingHandler) ChangePlan(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":   "plan_changes_disabled",
		"message": "Plan changes are managed by ChainProof support. Contact us or upgrade via your account manager.",
	})
}
