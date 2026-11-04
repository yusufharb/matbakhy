package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	jwtSecret = []byte("nexus-marketplace-jwt-secret-key-2026-production")
	ErrUnauthorized = errors.New("unauthorized")
)

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	OrgID  string `json:"org_id,omitempty"`
	Role   string `json:"role,omitempty"`
	jwt.RegisteredClaims
}

type contextKey string

const (
	UserContextKey   contextKey = "auth_user"
	ClaimsContextKey contextKey = "auth_claims"
)

// HashPassword hashes plain text password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash compares plain password with hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateJWT creates a signed token valid for 72 hours
func GenerateJWT(userID, email, orgID, role string) (string, error) {
	expirationTime := time.Now().Add(72 * time.Hour)
	claims := &Claims{
		UserID: userID,
		Email:  email,
		OrgID:  orgID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "nexus-marketplace-core",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateJWT parses and validates the token
func ValidateJWT(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return nil, ErrUnauthorized
	}
	return claims, nil
}

// AuthMiddleware extracts Bearer token, validates it, and injects claims into Context
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			next.ServeHTTP(w, r)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			next.ServeHTTP(w, r)
			return
		}

		claims, err := ValidateJWT(parts[1])
		if err == nil && claims != nil {
			ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
			r = r.WithContext(ctx)
		}

		next.ServeHTTP(w, r)
	})
}

// GetClaims retrieves claims from context
func GetClaims(ctx context.Context) *Claims {
	if val, ok := ctx.Value(ClaimsContextKey).(*Claims); ok {
		return val
	}
	return nil
}
