package handlers

import (
	"net/http"
	"strconv"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/middleware"
	"github.com/chainproof/baas/internal/models"
	"github.com/chainproof/baas/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type IntegrityHandler struct {
	integrity *services.IntegrityService
	platform  *database.PlatformDB
}

func NewIntegrityHandler(s *services.IntegrityService, platform *database.PlatformDB) *IntegrityHandler {
	return &IntegrityHandler{integrity: s, platform: platform}
}

func (h *IntegrityHandler) Anchor(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	var req models.AnchorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	claims := middleware.GetClaims(c)
	rec, err := h.integrity.Anchor(c.Request.Context(), slug, claims.UserID.String(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rec)
}

func (h *IntegrityHandler) Verify(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	var req models.VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := h.integrity.Verify(c.Request.Context(), slug, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	status := http.StatusOK
	if !resp.Intact {
		status = http.StatusConflict
	}
	c.JSON(status, resp)
}

func (h *IntegrityHandler) ListIncidents(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	incidents, err := h.integrity.ListIncidents(c.Request.Context(), slug, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if incidents == nil {
		incidents = []models.TamperIncident{}
	}
	c.JSON(http.StatusOK, incidents)
}

func (h *IntegrityHandler) ListRecords(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	records, err := h.integrity.ListRecords(c.Request.Context(), slug, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if records == nil {
		records = []models.IntegrityRecord{}
	}
	c.JSON(http.StatusOK, records)
}

func (h *IntegrityHandler) DashboardStats(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	stats, err := h.integrity.DashboardStats(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

type SiteHandler struct {
	sites    *services.SiteService
	platform *database.PlatformDB
}

func NewSiteHandler(s *services.SiteService, platform *database.PlatformDB) *SiteHandler {
	return &SiteHandler{sites: s, platform: platform}
}

func (h *SiteHandler) Create(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	var site models.Site
	if err := c.ShouldBindJSON(&site); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	created, err := h.sites.Create(c.Request.Context(), slug, site)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *SiteHandler) List(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	sites, err := h.sites.List(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if sites == nil {
		sites = []models.Site{}
	}
	c.JSON(http.StatusOK, sites)
}

func (h *SiteHandler) Discover(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	endpoints, err := h.sites.DiscoverEndpoints(c.Request.Context(), slug, siteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"discovered": endpoints})
}

func (h *SiteHandler) ListEndpoints(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	endpoints, err := h.sites.ListEndpoints(c.Request.Context(), slug, siteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if endpoints == nil {
		endpoints = []models.ProtectedEndpoint{}
	}
	c.JSON(http.StatusOK, endpoints)
}

func (h *SiteHandler) ToggleEndpoint(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	epID, err := uuid.Parse(c.Param("epId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid endpoint id"})
		return
	}
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.sites.ToggleEndpoint(c.Request.Context(), slug, epID, body.Enabled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

type APIKeyHandler struct {
	keys     *services.APIKeyService
	platform *database.PlatformDB
}

func NewAPIKeyHandler(s *services.APIKeyService, platform *database.PlatformDB) *APIKeyHandler {
	return &APIKeyHandler{keys: s, platform: platform}
}

func (h *APIKeyHandler) Create(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	var body struct {
		Name   string   `json:"name" binding:"required"`
		Scopes []string `json:"scopes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	claims := middleware.GetClaims(c)
	key, err := h.keys.Create(c.Request.Context(), slug, body.Name, body.Scopes, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, key)
}

func (h *APIKeyHandler) List(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	keys, err := h.keys.List(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if keys == nil {
		keys = []models.APIKey{}
	}
	c.JSON(http.StatusOK, keys)
}

func (h *APIKeyHandler) Revoke(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	keyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid key id"})
		return
	}
	if err := h.keys.Revoke(c.Request.Context(), slug, keyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

type PlatformHandler struct {
	db *services.PlatformService
}

func NewPlatformHandler(s *services.PlatformService) *PlatformHandler {
	return &PlatformHandler{db: s}
}

func (h *PlatformHandler) ListPlans(c *gin.Context) {
	plans, err := h.db.ListPlans(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plans)
}

func (h *PlatformHandler) ListOrganizations(c *gin.Context) {
	orgs, err := h.db.ListOrganizations(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if orgs == nil {
		orgs = []models.Organization{}
	}
	c.JSON(http.StatusOK, orgs)
}

func (h *PlatformHandler) Overview(c *gin.Context) {
	overview, err := h.db.Overview(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, overview)
}

func (h *PlatformHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "chainproof-api",
		"version": "1.0.0",
	})
}
