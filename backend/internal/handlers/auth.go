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
		"email_verified": user.EmailVerified,
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

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var body struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_ = h.auth.ForgotPassword(c.Request.Context(), body.Email)
	c.JSON(http.StatusOK, gin.H{"message": "If that email exists, we sent reset instructions."})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var body struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.auth.ResetPassword(c.Request.Context(), body.Token, body.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		var body struct {
			Token string `json:"token" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "token required"})
			return
		}
		token = body.Token
	}
	if err := h.auth.VerifyEmail(c.Request.Context(), token); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *AuthHandler) ResendVerification(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if err := h.auth.SendVerificationEmail(c.Request.Context(), claims.UserID.String()); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
