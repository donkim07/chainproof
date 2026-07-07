package handlers

import (
	"fmt"
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
	sites     *services.SiteService
	platform  *database.PlatformDB
	secret    string
}

func NewIntegrityHandler(s *services.IntegrityService, sites *services.SiteService, platform *database.PlatformDB, secret string) *IntegrityHandler {
	return &IntegrityHandler{integrity: s, sites: sites, platform: platform, secret: secret}
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
	rec, err := h.integrity.Anchor(c.Request.Context(), slug, middleware.GetActorID(c), req)
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

func (h *IntegrityHandler) ScanTamper(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	stats, err := h.sites.PollProtectedEndpoints(c.Request.Context(), slug, h.secret, h.integrity)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	anchorStats, err := h.integrity.VerifyAnchoredRecords(c.Request.Context(), slug, h.sites, h.secret, 200)
	if err == nil {
		stats.Anchored += anchorStats.Anchored
		stats.Verified += anchorStats.Verified
		stats.Tampered += anchorStats.Tampered
	}
	c.JSON(http.StatusOK, gin.H{
		"anchored": stats.Anchored,
		"verified": stats.Verified,
		"tampered": stats.Tampered,
		"skipped":  stats.Skipped,
		"message":  fmt.Sprintf("poll complete — %d verified, %d tampered, %d newly anchored", stats.Verified, stats.Tampered, stats.Anchored),
	})
}

type SiteHandler struct {
	sites     *services.SiteService
	integrity *services.IntegrityService
	platform  *database.PlatformDB
	secret    string
}

func NewSiteHandler(s *services.SiteService, integrity *services.IntegrityService, platform *database.PlatformDB, secret string) *SiteHandler {
	return &SiteHandler{sites: s, integrity: integrity, platform: platform, secret: secret}
}

func (h *SiteHandler) Create(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	var req models.SiteUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	created, err := h.sites.Create(c.Request.Context(), slug, models.Site{
		Name: req.Name, BaseURL: req.BaseURL, IntegrationMode: req.IntegrationMode, DBType: req.DBType,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *SiteHandler) Get(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	site, err := h.sites.Get(c.Request.Context(), slug, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "site not found"})
		return
	}
	c.JSON(http.StatusOK, site)
}

func (h *SiteHandler) Update(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	var req models.SiteUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	site, err := h.sites.Update(c.Request.Context(), slug, id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, site)
}

func (h *SiteHandler) Delete(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	if err := h.sites.Delete(c.Request.Context(), slug, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
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
	c.JSON(http.StatusOK, endpoints)
}

func (h *SiteHandler) ForceIntegrity(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	result, err := h.sites.ForceIntegrityCheck(c.Request.Context(), slug, siteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *SiteHandler) ExportEndpoints(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	csv, err := h.sites.ExportEndpointsCSV(c.Request.Context(), slug, siteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=endpoints.csv")
	c.String(http.StatusOK, csv)
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

func (h *SiteHandler) AddEndpoint(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	var body struct {
		Method      string `json:"method" binding:"required"`
		PathPattern string `json:"path_pattern" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ep, err := h.sites.AddEndpoint(c.Request.Context(), slug, siteID, body.Method, body.PathPattern)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, ep)
}

func (h *SiteHandler) DeleteEndpoint(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	epID, err := uuid.Parse(c.Param("epId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid endpoint id"})
		return
	}
	if err := h.sites.DeleteEndpoint(c.Request.Context(), slug, epID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *SiteHandler) GetAuth(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	auth, err := h.sites.GetAuthSettings(c.Request.Context(), slug, siteID, h.secret)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, auth)
}

func (h *SiteHandler) UpdateAuth(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	var req services.SiteAuthSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	auth, err := h.sites.UpdateAuthSettings(c.Request.Context(), slug, siteID, h.secret, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, auth)
}

func (h *SiteHandler) TestEndpoint(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	var body struct {
		Method string `json:"method" binding:"required"`
		Path   string `json:"path" binding:"required"`
		Body   string `json:"body"`
		Anchor bool   `json:"anchor"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.sites.TestEndpoint(c.Request.Context(), slug, h.secret, siteID, body.Method, body.Path, body.Body, body.Anchor, h.integrity)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *SiteHandler) ListCaptures(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	logs, err := h.sites.ListCaptureLogs(c.Request.Context(), slug, siteID, 50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if logs == nil {
		logs = []models.ProxyCaptureLog{}
	}
	c.JSON(http.StatusOK, logs)
}

func (h *SiteHandler) Analytics(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	data, err := h.sites.TenantAnalytics(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
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
	key, err := h.keys.Create(c.Request.Context(), slug, body.Name, body.Scopes, claims.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"id":         key.ID,
		"name":       key.Name,
		"key_prefix": key.KeyPrefix,
		"scopes":     key.Scopes,
		"active":     key.Active,
		"created_at": key.CreatedAt,
		"plain_key":  key.PlainKey,
	})
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
	db        *services.PlatformService
	analytics *services.PlatformAnalytics
	extended  *services.PlatformExtended
}

func NewPlatformHandler(s *services.PlatformService, analytics *services.PlatformAnalytics, extended *services.PlatformExtended) *PlatformHandler {
	return &PlatformHandler{db: s, analytics: analytics, extended: extended}
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
	if h.analytics != nil {
		overview, err := h.analytics.ExtendedOverview(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, overview)
		return
	}
	overview, err := h.db.Stats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, overview)
}

func (h *PlatformHandler) ScannerStatus(c *gin.Context) {
	if h.analytics == nil {
		c.JSON(http.StatusOK, services.ScannerStatus{})
		return
	}
	c.JSON(http.StatusOK, h.analytics.ScannerStatus())
}

func (h *PlatformHandler) ListAllSites(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	sites, err := h.analytics.ListAllSites(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sites)
}

func (h *PlatformHandler) ListPlatformIncidents(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	incidents, err := h.analytics.ListOpenIncidents(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, incidents)
}

func (h *PlatformHandler) ListUsers(c *gin.Context) {
	users, err := h.db.ListUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if users == nil {
		users = []models.PlatformUser{}
	}
	c.JSON(http.StatusOK, users)
}

func (h *PlatformHandler) ListAuditLogs(c *gin.Context) {
	logs, err := h.db.ListAuditLogs(c.Request.Context(), 100)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *PlatformHandler) UpdateOrganization(c *gin.Context) {
	orgID := c.Param("id")
	var body struct {
		Active   *bool   `json:"active"`
		PlanSlug *string `json:"plan_slug"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.UpdateOrganization(c.Request.Context(), orgID, body.Active, body.PlanSlug); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PlatformHandler) ListPlansAdmin(c *gin.Context) {
	plans, err := h.db.ListPlansAdmin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plans)
}

func (h *PlatformHandler) UpdatePlanAdmin(c *gin.Context) {
	planID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid plan id"})
		return
	}
	var req models.PlanUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	plan, err := h.db.UpdatePlan(c.Request.Context(), planID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plan)
}

func (h *PlatformHandler) BillingOverview(c *gin.Context) {
	if h.extended == nil {
		c.JSON(http.StatusOK, gin.H{})
		return
	}
	data, err := h.extended.BillingOverview(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *PlatformHandler) UsageReport(c *gin.Context) {
	if h.extended == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not available"})
		return
	}
	csv, err := h.extended.UsageReportCSV(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=usage-report.csv")
	c.String(http.StatusOK, csv)
}

func (h *PlatformHandler) GetSettings(c *gin.Context) {
	key := c.Param("key")
	if h.extended == nil {
		c.JSON(http.StatusOK, gin.H{})
		return
	}
	data, _ := h.extended.GetSettings(c.Request.Context(), key)
	c.JSON(http.StatusOK, data)
}

func (h *PlatformHandler) UpdateSettings(c *gin.Context) {
	key := c.Param("key")
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.extended.UpdateSettings(c.Request.Context(), key, body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PlatformHandler) ListWordlists(c *gin.Context) {
	if h.extended == nil {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}
	list, err := h.extended.ListWordlists(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *PlatformHandler) UploadWordlist(c *gin.Context) {
	var body struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	entry, err := h.extended.SaveWordlist(c.Request.Context(), body.Name, body.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, entry)
}

func (h *PlatformHandler) Impersonate(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	token, expires, err := h.extended.Impersonate(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "expires_at": expires})
}

func (h *PlatformHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "chainproof-api",
		"version": "1.0.0",
	})
}
