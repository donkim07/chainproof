package middleware

import (
	"net/http"

	"github.com/chainproof/baas/internal/services"
	"github.com/gin-gonic/gin"
)

// RequireTenantPermission checks tenant RBAC (Spatie-style) for org-scoped routes.
// Platform super_admin bypasses all tenant permission checks.
func RequireTenantPermission(perms *services.PermissionService, permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		if claims.Role == "super_admin" {
			c.Next()
			return
		}
		if claims.Role == "owner" && permission != "billing:read" && permission != "billing:write" {
			c.Next()
			return
		}
		if claims.OrgSlug == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "organization context required"})
			return
		}
		ok, err := perms.HasPermission(c.Request.Context(), claims.OrgSlug, claims.Email, permission)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "permission check failed"})
			return
		}
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions", "required": permission})
			return
		}
		c.Next()
	}
}
