package wallet_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/auth"
	"github.com/marketplace/core/internal/modules/wallet"
)

func init() {
	_ = auth.SetJWTSecret("test-secret-key-that-is-at-least-32-characters-long-2026!")
}

func TestWalletHandlerAuthIsolation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	walletRepo := wallet.NewRepository(db.Pool)
	walletHandler := wallet.NewHandler(walletRepo)

	walletMux := auth.AuthMiddleware(http.HandlerFunc(walletHandler.GetSupplierWallet))
	ledgerMux := auth.AuthMiddleware(http.HandlerFunc(walletHandler.ListJournalEntries))
	postLedgerMux := auth.AuthMiddleware(http.HandlerFunc(walletHandler.PostJournalEntry))

	// Case 1: Unauthenticated request to wallet -> 401 Unauthorized
	req := httptest.NewRequest("GET", "/api/v1/supplier/wallet", nil)
	rec := httptest.NewRecorder()
	walletMux.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated wallet request, got %d", rec.Code)
	}

	// Case 2: Supplier A trying to view Supplier B's wallet -> 403 Forbidden
	supplierAToken, _ := auth.GenerateJWT(
		"a0000000-0000-0000-0000-000000000003",
		"supplier@nourafoods.com",
		"b0000000-0000-0000-0000-000000000002", // Noura Foods
		"supplier_admin",
	)

	req = httptest.NewRequest("GET", "/api/v1/supplier/wallet?supplier_id=b0000000-0000-0000-0000-000000000003", nil)
	req.Header.Set("Authorization", "Bearer "+supplierAToken)
	rec = httptest.NewRecorder()
	walletMux.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden when Supplier A queries Supplier B's wallet, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	// Case 3: Supplier A viewing their own wallet -> 200 OK
	req = httptest.NewRequest("GET", "/api/v1/supplier/wallet", nil)
	req.Header.Set("Authorization", "Bearer "+supplierAToken)
	rec = httptest.NewRecorder()
	walletMux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for Supplier A viewing their own wallet, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	// Case 4: Supplier trying to access Admin Ledger entries -> 403 Forbidden
	req = httptest.NewRequest("GET", "/api/v1/ledger/entries", nil)
	req.Header.Set("Authorization", "Bearer "+supplierAToken)
	rec = httptest.NewRecorder()
	// In main.go, AuthMiddleware runs globally, then RequireRole runs
	auth.AuthMiddleware(auth.RequireRole("platform_admin", "super_admin")(http.HandlerFunc(walletHandler.ListJournalEntries))).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden when supplier attempts to view ledger entries, got %d", rec.Code)
	}

	// Case 5: Supplier trying to manually POST journal entry -> 403 Forbidden
	req = httptest.NewRequest("POST", "/api/v1/ledger/entries", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+supplierAToken)
	rec = httptest.NewRecorder()
	postLedgerMux.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden when supplier attempts to POST journal entry, got %d", rec.Code)
	}

	// Case 6: Platform Admin accessing ledger entries -> 200 OK
	adminToken, _ := auth.GenerateJWT(
		"a0000000-0000-0000-0000-000000000001",
		"amal@nexus.market",
		"b0000000-0000-0000-0000-000000000001",
		"platform_admin",
	)

	req = httptest.NewRequest("GET", "/api/v1/ledger/entries", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	ledgerMux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for platform_admin accessing ledger entries, got %d", rec.Code)
	}
}
