package middleware

import (
	"net/http"
	"strings"

	"github.com/chainproof/baas/internal/auth"
	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/services"
	"github.com/gin-gonic/gin"
)

const APIKeyScopesKey = "api_key_scopes"

// JWTOrAPIKeyAuth accepts owner JWT (Authorization: Bearer eyJ...)
// or a ChainProof API key via X-API-Key or Authorization: Bearer cp_...
func JWTOrAPIKeyAuth(jwtSvc *auth.JWTService, keys *services.APIKeyService, platform *database.PlatformDB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if apiKey := extractAPIKey(c); apiKey != "" {
			result, err := keys.ResolveByPlainKey(c.Request.Context(), platform, apiKey)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid api key"})
				return
			}
			c.Set(ClaimsKey, &auth.Claims{
				UserID:  result.KeyID,
				Email:   "api-key",
				Role:    "api_key",
				OrgSlug: result.OrgSlug,
			})
			c.Set(APIKeyScopesKey, result.Scopes)
			c.Next()
			return
		}

		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			return
		}
		claims, err := jwtSvc.Parse(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}
		c.Set(ClaimsKey, claims)
		c.Next()
	}
}

func extractAPIKey(c *gin.Context) string {
	if k := strings.TrimSpace(c.GetHeader("X-API-Key")); k != "" {
		return k
	}
	header := c.GetHeader("Authorization")
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}
	token := strings.TrimSpace(parts[1])
	if strings.HasPrefix(token, "cp_") {
		return token
	}
	return ""
}

func RequireAPIScope(scope string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil || claims.Role != "api_key" {
			c.Next()
			return
		}
		val, ok := c.Get(APIKeyScopesKey)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "api key missing scopes"})
			return
		}
		scopes, _ := val.([]string)
		if !services.HasScope(scopes, scope) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "api key scope denied", "required_scope": scope})
			return
		}
		c.Next()
	}
}

func GetActorID(c *gin.Context) string {
	claims := GetClaims(c)
	if claims == nil {
		return ""
	}
	if claims.Role == "api_key" {
		return "api-key:" + claims.UserID.String()
	}
	return claims.UserID.String()
}
