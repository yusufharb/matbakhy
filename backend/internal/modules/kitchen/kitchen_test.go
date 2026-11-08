package kitchen_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/auth"
	"github.com/marketplace/core/internal/modules/kitchen"
)

func TestKitchenListingAndFiltering(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	repo := kitchen.NewRepository(db.Pool)
	kitchens, err := repo.ListKitchens(ctx, "")
	if err != nil {
		t.Fatalf("failed to list kitchens: %v", err)
	}
	if len(kitchens) == 0 {
		t.Logf("no open kitchens in database, verify seeds")
	}

	// Filter by Cairo district
	cairoKitchens, err := repo.ListKitchens(ctx, "Maadi")
	if err != nil {
		t.Fatalf("failed to filter kitchens by district: %v", err)
	}
	for _, k := range cairoKitchens {
		if !strings.Contains(k.District, "Maadi") {
			t.Errorf("expected district to contain Maadi, got %s", k.District)
		}
	}
}

func TestUpdateSuborderPrepStatusValidation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	repo := kitchen.NewRepository(db.Pool)
	handler := kitchen.NewHandler(repo)

	// Mock claims for cook with org
	claims := &auth.Claims{
		UserID: "a0000000-0000-0000-0000-000000000002",
		Email:  "chef.fatima@matbakhy.eg",
		OrgID:  "b0000000-0000-0000-0000-000000000002",
		Role:   "supplier",
	}

	// 1. Invalid status test - should return 400 Bad Request
	invPayload, _ := json.Marshal(map[string]string{
		"prep_status": "exploit_status_inject",
	})
	req := httptest.NewRequest("PATCH", "/api/v1/cook/suborders/00000000-0000-0000-0000-000000000001/prep-status", bytes.NewReader(invPayload))
	req = req.WithContext(context.WithValue(req.Context(), auth.ClaimsContextKey, claims))
	rec := httptest.NewRecorder()

	handler.UpdateSuborderPrepStatus(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for invalid prep status, got %d", rec.Code)
	}

	// 2. Valid status should pass handler validation
	validPayload, _ := json.Marshal(map[string]string{
		"prep_status": "cooking",
		"cook_notes":  "Dish is simmering nicely",
	})
	req2 := httptest.NewRequest("PATCH", "/api/v1/cook/suborders/00000000-0000-0000-0000-000000000001/prep-status", bytes.NewReader(validPayload))
	req2 = req2.WithContext(context.WithValue(req2.Context(), auth.ClaimsContextKey, claims))
	rec2 := httptest.NewRecorder()

	handler.UpdateSuborderPrepStatus(rec2, req2)
	// Even if suborder doesn't exist in DB for this dummy ID, it should return 400 with "suborder not found or unauthorized", NOT 500
	if rec2.Code == http.StatusInternalServerError {
		t.Fatalf("expected 400 Bad Request for not found/unauthorized, got 500 Internal Server Error")
	}
}
