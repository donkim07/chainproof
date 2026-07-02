package handlers

import (
	"errors"
	"net/http"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/middleware"
	"github.com/gin-gonic/gin"
)

var errNoOrganization = errors.New("no organization associated with this account")

func resolveOrgSlug(c *gin.Context, platform *database.PlatformDB) (string, error) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		return "", errors.New("unauthorized")
	}

	if slug := c.GetHeader("X-Org-Slug"); slug != "" {
		return slug, nil
	}
	if claims.OrgSlug != "" {
		return claims.OrgSlug, nil
	}
	if claims.OrganizationID != nil {
		var slug string
		err := platform.Pool.QueryRow(c.Request.Context(),
			`SELECT slug FROM organizations WHERE id = $1 AND active = true`, claims.OrganizationID).Scan(&slug)
		if err == nil && slug != "" {
			return slug, nil
		}
	}

	return "", errNoOrganization
}

func tenantError(c *gin.Context, err error) {
	if errors.Is(err, errNoOrganization) {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "no_organization",
			"message": "This account has no organization. Register an organization or sign in with an owner account.",
		})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}

func requireOrgSlug(c *gin.Context, platform *database.PlatformDB) (string, bool) {
	slug, err := resolveOrgSlug(c, platform)
	if err != nil {
		tenantError(c, err)
		return "", false
	}
	return slug, true
}
