package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	jwtSecret       []byte
	jwtSecretMutex  sync.RWMutex
	ErrUnauthorized = errors.New("unauthorized: missing or invalid authentication token")
	ErrForbidden    = errors.New("forbidden: insufficient permissions for this resource")
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

// SetJWTSecret configures and validates the signing key for JWT tokens.
// Fails fast if the key is missing or shorter than 32 characters.
func SetJWTSecret(secret string) error {
	secret = strings.TrimSpace(secret)
	if len(secret) < 32 {
		return fmt.Errorf("JWT secret must be at least 32 characters long, got %d", len(secret))
	}
	jwtSecretMutex.Lock()
	defer jwtSecretMutex.Unlock()
	jwtSecret = []byte(secret)
	return nil
}

func getJWTSecret() ([]byte, error) {
	jwtSecretMutex.RLock()
	defer jwtSecretMutex.RUnlock()
	if len(jwtSecret) == 0 {
		return nil, errors.New("JWT secret has not been initialized. Set JWT_SECRET in environment")
	}
	return jwtSecret, nil
}

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

// GenerateJWT creates a signed access token valid for 15 minutes
func GenerateJWT(userID, email, orgID, role string) (string, error) {
	secret, err := getJWTSecret()
	if err != nil {
		return "", err
	}

	expirationTime := time.Now().Add(15 * time.Minute)
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
	return token.SignedString(secret)
}

// ValidateJWT parses and validates the token
func ValidateJWT(tokenStr string) (*Claims, error) {
	secret, err := getJWTSecret()
	if err != nil {
		return nil, err
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	})

	if err != nil || !token.Valid {
		return nil, ErrUnauthorized
	}
	return claims, nil
}

// AuthMiddleware extracts Bearer token, validates it, and injects claims into Context.
// If an Authorization header is provided but invalid, it rejects immediately with 401.
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			next.ServeHTTP(w, r)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			writeJSONError(w, http.StatusUnauthorized, "Invalid Authorization header format. Expected 'Bearer <token>'")
			return
		}

		claims, err := ValidateJWT(parts[1])
		if err != nil || claims == nil {
			writeJSONError(w, http.StatusUnauthorized, "Invalid or expired authentication token")
			return
		}

		ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
		r = r.WithContext(ctx)
		next.ServeHTTP(w, r)
	})
}

// RequireAuth enforces that the request has a valid authenticated session
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := GetClaims(r.Context())
		if claims == nil || claims.UserID == "" {
			writeJSONError(w, http.StatusUnauthorized, "Authentication required. Please provide a valid Bearer token")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireRole enforces that the authenticated user possesses one of the allowed roles
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, role := range roles {
		allowed[role] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil || claims.UserID == "" {
				writeJSONError(w, http.StatusUnauthorized, "Authentication required")
				return
			}

			// platform_admin and super_admin have universal access across roles
			if claims.Role == "platform_admin" || claims.Role == "super_admin" {
				next.ServeHTTP(w, r)
				return
			}

			if !allowed[claims.Role] {
				writeJSONError(w, http.StatusForbidden, fmt.Sprintf("Forbidden: Role '%s' does not have access to this resource", claims.Role))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequirePermission provides fine-grained capability checks
func RequirePermission(resource, action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil || claims.UserID == "" {
				writeJSONError(w, http.StatusUnauthorized, "Authentication required")
				return
			}

			// platform_admin has universal permission
			if claims.Role == "platform_admin" || claims.Role == "super_admin" {
				next.ServeHTTP(w, r)
				return
			}

			// Validate common role permissions
			switch resource {
			case "supplier":
				if action == "approve" || action == "reject" {
					writeJSONError(w, http.StatusForbidden, "Forbidden: Only platform admins can moderate suppliers")
					return
				}
			case "ledger":
				if action == "post" {
					writeJSONError(w, http.StatusForbidden, "Forbidden: Only platform admins can post manual ledger entries")
					return
				}
			case "inventory":
				if claims.Role != "supplier_admin" && claims.Role != "supplier" && claims.Role != "supplier_staff" {
					writeJSONError(w, http.StatusForbidden, "Forbidden: Only suppliers can adjust inventory")
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// EnforceSupplierOwnership checks if the caller can access supplier data
func EnforceSupplierOwnership(claims *Claims, targetSupplierID string) error {
	if claims == nil {
		return ErrUnauthorized
	}
	if claims.Role == "platform_admin" || claims.Role == "super_admin" {
		return nil
	}
	if claims.OrgID == "" || claims.OrgID != targetSupplierID {
		return ErrForbidden
	}
	return nil
}

// GetClaims retrieves claims from context
func GetClaims(ctx context.Context) *Claims {
	if val, ok := ctx.Value(ClaimsContextKey).(*Claims); ok {
		return val
	}
	return nil
}

func writeJSONError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"error": message,
		"code":  statusCode,
	})
}
