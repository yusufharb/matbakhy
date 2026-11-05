package order_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/auth"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/order"
)

func init() {
	_ = auth.SetJWTSecret("test-secret-key-that-is-at-least-32-characters-long-2026!")
}

func TestOrderHandlerAuthIsolation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)
	orderHandler := order.NewHandler(orderRepo)

	// Wrap with AuthMiddleware
	handler := auth.AuthMiddleware(http.HandlerFunc(orderHandler.ListSupplierSuborders))

	// Case 1: Unauthenticated request -> 401 Unauthorized
	req := httptest.NewRequest("GET", "/api/v1/supplier/suborders", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for unauthenticated suborder query, got %d", rec.Code)
	}

	// Case 2: Supplier A attempting to read Supplier B's suborders -> 403 Forbidden
	supplierAToken, err := auth.GenerateJWT(
		"a0000000-0000-0000-0000-000000000003",
		"supplier@nourafoods.com",
		"b0000000-0000-0000-0000-000000000002", // Noura Foods
		"supplier_admin",
	)
	if err != nil {
		t.Fatalf("failed to generate supplier A token: %v", err)
	}

	// Supplier A requesting Atlas Industrial (Supplier B) suborders
	req = httptest.NewRequest("GET", "/api/v1/supplier/suborders?supplier_id=b0000000-0000-0000-0000-000000000003", nil)
	req.Header.Set("Authorization", "Bearer "+supplierAToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden when Supplier A queries Supplier B, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	// Case 3: Supplier A requesting their own suborders -> 200 OK
	req = httptest.NewRequest("GET", "/api/v1/supplier/suborders", nil)
	req.Header.Set("Authorization", "Bearer "+supplierAToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK when Supplier A queries their own suborders, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	// Case 4: Merchant role trying to access supplier suborders -> 403 Forbidden
	merchantToken, err := auth.GenerateJWT(
		"a0000000-0000-0000-0000-000000000004",
		"buyer@meridian.com",
		"b0000000-0000-0000-0000-000000000004", // Meridian Labs
		"merchant_admin",
	)
	if err != nil {
		t.Fatalf("failed to generate merchant token: %v", err)
	}

	req = httptest.NewRequest("GET", "/api/v1/supplier/suborders", nil)
	req.Header.Set("Authorization", "Bearer "+merchantToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden when merchant queries supplier suborders, got %d", rec.Code)
	}
}
