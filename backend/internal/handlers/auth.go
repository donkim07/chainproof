package handlers

import (
	"net/http"

	"github.com/chainproof/baas/internal/middleware"
	"github.com/chainproof/baas/internal/models"
	"github.com/chainproof/baas/internal/services"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	auth  *services.AuthService
	perms *services.PermissionService
}

func NewAuthHandler(auth *services.AuthService, perms *services.PermissionService) *AuthHandler {
	return &AuthHandler{auth: auth, perms: perms}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := h.auth.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := h.auth.Login(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Me(c *gin.Context) {
	claims := middleware.GetClaims(c)
	user, err := h.auth.Me(c.Request.Context(), claims.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	resp := gin.H{
		"id": user.ID, "email": user.Email, "full_name": user.FullName,
		"role": user.Role, "org_slug": user.OrgSlug, "org_name": user.OrgName,
	}
	if claims.OrgSlug != "" && h.perms != nil {
		if perms, err := h.perms.UserPermissions(c.Request.Context(), claims.OrgSlug, claims.Email); err == nil {
			resp["permissions"] = perms
		}
	}
	if claims.Role == "super_admin" {
		resp["permissions"] = []string{"*"}
	}
	c.JSON(http.StatusOK, resp)
}
