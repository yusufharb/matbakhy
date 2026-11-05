package order_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/auth"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/order"
	"github.com/marketplace/core/internal/modules/platform"
)

func TestCheckoutIdempotencyEnforcement(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping live database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)
	idemStore := platform.NewIdempotencyStore(db.Pool)
	orderHandler := order.NewHandler(orderRepo, idemStore)

	merchantToken, _ := auth.GenerateJWT(
		"a0000000-0000-0000-0000-000000000004",
		"buyer@meridian.com",
		"b0000000-0000-0000-0000-000000000004",
		"merchant_admin",
	)

	handler := auth.AuthMiddleware(auth.RequireAuth(http.HandlerFunc(orderHandler.Checkout)))

	_, _ = db.Pool.Exec(ctx, `UPDATE catalog.supplier_offers SET moq = 1 WHERE id = 'f0000000-0000-0000-0000-000000000001'`)

	orderPayload1 := order.CheckoutRequest{
		MerchantID:    "b0000000-0000-0000-0000-000000000004",
		PaymentMethod: "gateway",
		Items: []order.CheckoutItemInput{
			{OfferID: "f0000000-0000-0000-0000-000000000001", Quantity: 1},
		},
	}
	bodyBytes1, _ := json.Marshal(orderPayload1)

	// Test 1: Missing Idempotency-Key header must return 400 Bad Request
	req1 := httptest.NewRequest("POST", "/api/v1/checkout", bytes.NewReader(bodyBytes1))
	req1.Header.Set("Authorization", "Bearer "+merchantToken)
	req1.Header.Set("Content-Type", "application/json")
	rec1 := httptest.NewRecorder()
	handler.ServeHTTP(rec1, req1)

	if rec1.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for missing Idempotency-Key, got %d (body: %s)", rec1.Code, rec1.Body.String())
	}

	// Test 2: Valid Idempotency-Key first call succeeds (201 Created)
	uniqueIdemKey := "idem-test-order-" + time.Now().Format("20060102150405.000000")
	req2 := httptest.NewRequest("POST", "/api/v1/checkout", bytes.NewReader(bodyBytes1))
	req2.Header.Set("Authorization", "Bearer "+merchantToken)
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Idempotency-Key", uniqueIdemKey)
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created for initial checkout, got %d (body: %s)", rec2.Code, rec2.Body.String())
	}

	var resp2 map[string]interface{}
	_ = json.Unmarshal(rec2.Body.Bytes(), &resp2)
	parentOrder2, ok := resp2["parent_order"].(map[string]interface{})
	if !ok || parentOrder2["id"] == nil {
		t.Fatalf("expected parent_order in response: %+v", resp2)
	}
	orderID1 := parentOrder2["id"].(string)

	// Count orders before replay
	var orderCountBefore int
	_ = db.Pool.QueryRow(ctx, `SELECT count(*) FROM commerce.orders WHERE id = $1`, orderID1).Scan(&orderCountBefore)

	// Test 3: Replay with same Idempotency-Key and same payload returns original result without duplicate order
	req3 := httptest.NewRequest("POST", "/api/v1/checkout", bytes.NewReader(bodyBytes1))
	req3.Header.Set("Authorization", "Bearer "+merchantToken)
	req3.Header.Set("Content-Type", "application/json")
	req3.Header.Set("Idempotency-Key", uniqueIdemKey)
	rec3 := httptest.NewRecorder()
	handler.ServeHTTP(rec3, req3)

	if rec3.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created on idempotent replay, got %d", rec3.Code)
	}

	var resp3 map[string]interface{}
	_ = json.Unmarshal(rec3.Body.Bytes(), &resp3)
	parentOrder3 := resp3["parent_order"].(map[string]interface{})
	orderID2 := parentOrder3["id"].(string)

	if orderID1 != orderID2 {
		t.Fatalf("expected replay to return original order ID %s, got %s", orderID1, orderID2)
	}

	// Verify no duplicate order inserted
	var orderCountAfter int
	_ = db.Pool.QueryRow(ctx, `SELECT count(*) FROM commerce.orders WHERE id = $1`, orderID1).Scan(&orderCountAfter)
	if orderCountAfter != 1 {
		t.Fatalf("expected exactly 1 order in database, got %d", orderCountAfter)
	}

	// Test 4: Same Idempotency-Key with DIFFERENT payload must return 409 Conflict
	orderPayloadDiff := order.CheckoutRequest{
		MerchantID:    "b0000000-0000-0000-0000-000000000004",
		PaymentMethod: "gateway",
		Items: []order.CheckoutItemInput{
			{OfferID: "f0000000-0000-0000-0000-000000000001", Quantity: 2}, // Different quantity
		},
	}
	bodyBytesDiff, _ := json.Marshal(orderPayloadDiff)

	req4 := httptest.NewRequest("POST", "/api/v1/checkout", bytes.NewReader(bodyBytesDiff))
	req4.Header.Set("Authorization", "Bearer "+merchantToken)
	req4.Header.Set("Content-Type", "application/json")
	req4.Header.Set("Idempotency-Key", uniqueIdemKey)
	rec4 := httptest.NewRecorder()
	handler.ServeHTTP(rec4, req4)

	if rec4.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict for same Idempotency-Key with different payload, got %d (body: %s)", rec4.Code, rec4.Body.String())
	}
}
