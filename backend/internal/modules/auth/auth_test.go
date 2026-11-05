package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func init() {
	_ = SetJWTSecret("test-secret-key-that-is-at-least-32-characters-long-2026!")
}

// 1. Test JWT secret length validation and fail-fast
func TestJWTSecretValidation(t *testing.T) {
	shortSecret := "short-secret"
	err := SetJWTSecret(shortSecret)
	if err == nil {
		t.Fatalf("expected error when setting JWT secret shorter than 32 chars, got nil")
	}

	validSecret := "a-sufficiently-long-secret-key-for-hmac-sha256-signing"
	err = SetJWTSecret(validSecret)
	if err != nil {
		t.Fatalf("expected valid secret to be accepted, got: %v", err)
	}
}

// 2. Test JWT generation, validation, and tampering rejection
func TestGenerateAndValidateJWT(t *testing.T) {
	token, err := GenerateJWT("user-123", "amal@nexus.market", "org-platform", "platform_admin")
	if err != nil {
		t.Fatalf("failed to generate JWT: %v", err)
	}

	claims, err := ValidateJWT(token)
	if err != nil {
		t.Fatalf("failed to validate valid JWT: %v", err)
	}

	if claims.UserID != "user-123" || claims.Email != "amal@nexus.market" || claims.Role != "platform_admin" {
		t.Fatalf("unexpected claims values: %+v", claims)
	}

	// Tampered token must fail
	tampered := token + "tampered"
	_, err = ValidateJWT(tampered)
	if err == nil {
		t.Fatalf("expected tampered token to fail validation, but it succeeded")
	}
}

// 3. Test RequireAuth middleware (missing / invalid token returns 401)
func TestRequireAuthMiddleware(t *testing.T) {
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status": "ok"}`))
	})

	protected := AuthMiddleware(RequireAuth(dummyHandler))

	// Case A: Missing token -> 401 Unauthorized
	req := httptest.NewRequest("GET", "/protected", nil)
	rec := httptest.NewRecorder()
	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for missing token, got %d", rec.Code)
	}

	// Case B: Invalid / corrupted Bearer token -> 401 Unauthorized
	req = httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid.jwt.token")
	rec = httptest.NewRecorder()
	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for invalid token, got %d", rec.Code)
	}

	// Case C: Valid token -> 200 OK
	token, _ := GenerateJWT("user-123", "amal@nexus.market", "org-platform", "platform_admin")
	req = httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec = httptest.NewRecorder()
	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for valid token, got %d (body: %s)", rec.Code, rec.Body.String())
	}
}

// 4. Test RequireRole middleware (wrong role returns 403 Forbidden)
func TestRequireRoleMiddleware(t *testing.T) {
	adminOnlyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"admin": true}`))
	})

	protectedAdmin := AuthMiddleware(RequireRole("platform_admin", "super_admin")(adminOnlyHandler))

	// Case A: Supplier role trying to access platform admin route -> 403 Forbidden
	supplierToken, _ := GenerateJWT("user-supplier", "supplier@nourafoods.com", "org-supplier-1", "supplier_admin")
	req := httptest.NewRequest("POST", "/admin/suppliers/123/approve", nil)
	req.Header.Set("Authorization", "Bearer "+supplierToken)
	rec := httptest.NewRecorder()
	protectedAdmin.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for supplier accessing admin route, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	// Case B: Platform Admin accessing platform admin route -> 200 OK
	adminToken, _ := GenerateJWT("user-admin", "amal@nexus.market", "org-platform", "platform_admin")
	req = httptest.NewRequest("POST", "/admin/suppliers/123/approve", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	protectedAdmin.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for platform_admin accessing admin route, got %d", rec.Code)
	}
}

// 5. Test Object-Level Authorization: Supplier cannot access another supplier's data
func TestObjectLevelAuthorization(t *testing.T) {
	supplierAClaims := &Claims{
		UserID: "user-sup-a",
		Email:  "supplierA@domain.com",
		OrgID:  "org-supplier-A",
		Role:   "supplier_admin",
	}

	// Supplier A querying Supplier A -> Allowed
	err := EnforceSupplierOwnership(supplierAClaims, "org-supplier-A")
	if err != nil {
		t.Fatalf("expected supplier A to access their own org data, got error: %v", err)
	}

	// Supplier A querying Supplier B -> 403 Forbidden
	err = EnforceSupplierOwnership(supplierAClaims, "org-supplier-B")
	if err != ErrForbidden {
		t.Fatalf("expected ErrForbidden when supplier A accesses supplier B, got: %v", err)
	}

	// Platform admin querying Supplier B -> Allowed
	adminClaims := &Claims{
		UserID: "user-admin",
		Email:  "amal@nexus.market",
		OrgID:  "org-platform",
		Role:   "platform_admin",
	}
	err = EnforceSupplierOwnership(adminClaims, "org-supplier-B")
	if err != nil {
		t.Fatalf("expected platform admin to have universal access to supplier data, got: %v", err)
	}
}

// 6. Test Backdoor Elimination: Default passwords "password" and "admin123" must be rejected
func TestBackdoorEliminated(t *testing.T) {
	// A secure password hash
	realPassword := "NexusPassword2026!"
	hash, err := HashPassword(realPassword)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	// Legitimate password passes
	if !CheckPasswordHash(realPassword, hash) {
		t.Fatalf("legitimate password check failed")
	}

	// Backdoor passwords must FAIL
	if CheckPasswordHash("password", hash) {
		t.Fatalf("SECURITY VIOLATION: password backdoor accepted 'password'")
	}
	if CheckPasswordHash("admin123", hash) {
		t.Fatalf("SECURITY VIOLATION: password backdoor accepted 'admin123'")
	}
	if CheckPasswordHash("123456", hash) {
		t.Fatalf("SECURITY VIOLATION: password check accepted '123456'")
	}
}

// 7. Verify JSON Error Envelope Consistency
func TestJSONErrorFormat(t *testing.T) {
	rec := httptest.NewRecorder()
	writeJSONError(rec, http.StatusUnauthorized, "Token expired")

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to unmarshal JSON error: %v", err)
	}

	if body["error"] != "Token expired" || body["code"] != float64(401) {
		t.Fatalf("unexpected JSON error format: %+v", body)
	}
}
