package handlers

import (
	"net/http"
	"strconv"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/middleware"
	"github.com/chainproof/baas/internal/services"
	"github.com/gin-gonic/gin"
)

type InboxHandler struct {
	inbox    *services.InboxService
	platform *database.PlatformDB
}

func NewInboxHandler(inbox *services.InboxService, platform *database.PlatformDB) *InboxHandler {
	return &InboxHandler{inbox: inbox, platform: platform}
}

func (h *InboxHandler) List(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	claims := middleware.GetClaims(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	items, err := h.inbox.List(c.Request.Context(), slug, claims.UserID.String(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *InboxHandler) UnreadCount(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	claims := middleware.GetClaims(c)
	n, err := h.inbox.UnreadCount(c.Request.Context(), slug, claims.UserID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": n})
}

func (h *InboxHandler) MarkRead(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	claims := middleware.GetClaims(c)
	if err := h.inbox.MarkRead(c.Request.Context(), slug, claims.UserID.String(), c.Param("id")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
