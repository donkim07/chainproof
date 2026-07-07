package handlers

import (
	"net/http"
	"strings"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/services"
	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	search   *services.DashboardSearchService
	platform *database.PlatformDB
}

func NewDashboardHandler(search *services.DashboardSearchService, platform *database.PlatformDB) *DashboardHandler {
	return &DashboardHandler{search: search, platform: platform}
}

func (h *DashboardHandler) Search(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	q := c.Query("q")
	results, err := h.search.Search(c.Request.Context(), slug, q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	nav := navMatches(q)
	c.JSON(http.StatusOK, gin.H{"results": results, "nav": nav})
}

func navMatches(q string) []services.SearchResult {
	if strings.TrimSpace(q) == "" {
		return nil
	}
	items := []services.SearchResult{
		{Type: "nav", Label: "Dashboard", Path: "/dashboard"},
		{Type: "nav", Label: "Analytics", Path: "/dashboard/analytics"},
		{Type: "nav", Label: "All Sites", Path: "/dashboard/sites"},
		{Type: "nav", Label: "Incidents", Path: "/dashboard/incidents"},
		{Type: "nav", Label: "Anchored Records", Path: "/dashboard/records"},
		{Type: "nav", Label: "API Keys", Path: "/dashboard/api-keys"},
		{Type: "nav", Label: "Team & Roles", Path: "/dashboard/team"},
		{Type: "nav", Label: "Billing", Path: "/dashboard/billing"},
		{Type: "nav", Label: "Notifications", Path: "/dashboard/notifications"},
		{Type: "nav", Label: "Settings", Path: "/dashboard/settings"},
	}
	var out []services.SearchResult
	ql := strings.ToLower(strings.TrimSpace(q))
	for _, it := range items {
		if strings.Contains(strings.ToLower(it.Label), ql) {
			out = append(out, it)
		}
	}
	return out
}
