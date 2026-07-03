package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID         uuid.UUID  `json:"user_id"`
	Email          string     `json:"email"`
	Role           string     `json:"role"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	OrgSlug        string     `json:"org_slug,omitempty"`
	jwt.RegisteredClaims
}

type JWTService struct {
	secret      []byte
	expiryHours int
}

func NewJWTService(secret string, expiryHours int) *JWTService {
	return &JWTService{secret: []byte(secret), expiryHours: expiryHours}
}

func (j *JWTService) Generate(userID uuid.UUID, email, role string, orgID *uuid.UUID, orgSlug string) (string, time.Time, error) {
	expiresAt := time.Now().Add(time.Duration(j.expiryHours) * time.Hour)
	claims := Claims{
		UserID:         userID,
		Email:          email,
		Role:           role,
		OrganizationID: orgID,
		OrgSlug:        orgSlug,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "chainproof",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(j.secret)
	return signed, expiresAt, err
}

func (j *JWTService) Parse(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return j.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
