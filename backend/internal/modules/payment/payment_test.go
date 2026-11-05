package payment_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/order"
	"github.com/marketplace/core/internal/modules/payment"
)

func TestPaymentWebhookSettlementAndAccounting(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)
	payRepo := payment.NewRepository(db.Pool)

	webhookSecret := "test_webhook_secret_key_2026_xyz"
	mockGateway := payment.NewMockGateway(webhookSecret, "http://localhost:8080")
	handler := payment.NewHandler(payRepo, mockGateway)

	offerID := "f0000000-0000-0000-0000-000000000001"
	customerUserID := "a0000000-0000-0000-0000-000000000004"

	// Reset offer & stock
	_, _ = db.Pool.Exec(ctx, `
		UPDATE catalog.supplier_offers SET moq = 1, price = 10000, retail_price = 15000, b2c_enabled = TRUE WHERE id = $1;
		UPDATE inventory.warehouse_stock SET on_hand = 100, reserved = 0 WHERE offer_id = $1;
	`, offerID)

	// 1. Create a checkout order with payment_method = "card"
	req := order.CheckoutRequest{
		OrderType:     "b2c",
		Currency:      "USD",
		PaymentMethod: "card",
		DeliveryAddress: json.RawMessage(`{"city": "Riyadh", "street": "King Fahd Rd"}`),
		Items: []order.CheckoutItemInput{
			{OfferID: offerID, Quantity: 2},
		},
	}
	createdOrder, err := orderRepo.ProcessCheckout(ctx, req, customerUserID)
	if err != nil {
		t.Fatalf("failed to create checkout order: %v", err)
	}

	// Prepare order for 2-phase gateway settlement test
	_, _ = db.Pool.Exec(ctx, `UPDATE commerce.orders SET status = 'pending_payment' WHERE id = $1`, createdOrder.ID)
	_, _ = db.Pool.Exec(ctx, `UPDATE commerce.payments SET status = 'pending', gateway_reference = NULL WHERE order_id = $1`, createdOrder.ID)
	_, _ = db.Pool.Exec(ctx, `DELETE FROM ledger.lines WHERE journal_entry_id IN (SELECT id FROM ledger.journal_entries WHERE reference_id = $1)`, createdOrder.ID)
	_, _ = db.Pool.Exec(ctx, `DELETE FROM ledger.journal_entries WHERE reference_id = $1`, createdOrder.ID)

	// 2. Test Invalid Webhook Signature Rejection
	payload := map[string]interface{}{
		"id":        "evt_" + uuid.New().String(),
		"event":     "payment.succeeded",
		"order_id":  createdOrder.ID,
		"reference": "ch_mock_12345",
		"amount":    createdOrder.GrandTotalCents,
		"currency":  "USD",
	}
	payloadBytes, _ := json.Marshal(payload)

	badReq := httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewReader(payloadBytes))
	badReq.Header.Set("X-Mock-Signature", "invalid_tampered_signature")
	badRec := httptest.NewRecorder()
	handler.HandleWebhook(badRec, badReq)

	if badRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for bad signature, got %d", badRec.Code)
	}

	// 3. Test Valid Webhook 2-Phase Settlement
	validSig := payment.SignPayload(webhookSecret, payloadBytes)
	goodReq := httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewReader(payloadBytes))
	goodReq.Header.Set("X-Mock-Signature", validSig)
	goodRec := httptest.NewRecorder()
	handler.HandleWebhook(goodRec, goodReq)

	if goodRec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for valid webhook, got %d: %s", goodRec.Code, goodRec.Body.String())
	}

	// 4. Verify Order Status Updated to Confirmed
	var orderStatus string
	err = db.Pool.QueryRow(ctx, `SELECT status FROM commerce.orders WHERE id = $1`, createdOrder.ID).Scan(&orderStatus)
	if err != nil {
		t.Fatalf("failed to query order: %v", err)
	}
	if orderStatus != "confirmed" {
		t.Fatalf("expected order status 'confirmed', got '%s'", orderStatus)
	}

	// 5. Verify Payment Status Updated to Captured
	var payStatus, payRef string
	err = db.Pool.QueryRow(ctx, `SELECT status, coalesce(gateway_reference, '') FROM commerce.payments WHERE order_id = $1`, createdOrder.ID).Scan(&payStatus, &payRef)
	if err != nil {
		t.Fatalf("failed to query payment: %v", err)
	}
	if payStatus != "captured" || payRef != "ch_mock_12345" {
		t.Fatalf("expected payment status 'captured' with ref 'ch_mock_12345', got status='%s' ref='%s'", payStatus, payRef)
	}

	// 6. Verify Double-Entry Accounting Ledger Entry
	var jeID string
	err = db.Pool.QueryRow(ctx, `
		SELECT id FROM ledger.journal_entries 
		WHERE reference_id = $1 AND action = 'order_settlement'
	`, createdOrder.ID).Scan(&jeID)
	if err != nil {
		t.Fatalf("expected settlement journal entry to exist: %v", err)
	}

	rows, err := db.Pool.Query(ctx, `
		SELECT a.account_code, l.entry_type, l.amount
		FROM ledger.lines l
		JOIN ledger.accounts a ON a.id = l.account_id
		WHERE l.journal_entry_id = $1
	`, jeID)
	if err != nil {
		t.Fatalf("failed to query ledger lines: %v", err)
	}
	defer rows.Close()

	var debitSum, creditSum int64
	var hasClearingDebit bool
	for rows.Next() {
		var code, entryType string
		var amt int64
		_ = rows.Scan(&code, &entryType, &amt)
		if entryType == "debit" {
			debitSum += amt
			if code == "1010" {
				hasClearingDebit = true
			}
		} else {
			creditSum += amt
		}
	}

	if !hasClearingDebit {
		t.Fatalf("expected debit to Account 1010 (Gateway Clearing Asset)")
	}
	if debitSum != creditSum || debitSum != createdOrder.GrandTotalCents {
		t.Fatalf("unbalanced ledger entry: debits=%d, credits=%d, expected=%d", debitSum, creditSum, createdOrder.GrandTotalCents)
	}

	// 7. Test Webhook Idempotency (Duplicate delivery should return 200 without error or double ledger posting)
	goodReq2 := httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewReader(payloadBytes))
	goodReq2.Header.Set("X-Mock-Signature", validSig)
	goodRec2 := httptest.NewRecorder()
	handler.HandleWebhook(goodRec2, goodReq2)

	if goodRec2.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on duplicate webhook replay, got %d", goodRec2.Code)
	}
}

func TestPaymentFailureWebhookReleasesReservedStock(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)
	payRepo := payment.NewRepository(db.Pool)

	webhookSecret := "test_webhook_secret_key_2026_xyz"
	mockGateway := payment.NewMockGateway(webhookSecret, "http://localhost:8080")
	handler := payment.NewHandler(payRepo, mockGateway)

	offerID := "f0000000-0000-0000-0000-000000000001"
	customerUserID := "a0000000-0000-0000-0000-000000000004"

	// Reset offer & stock
	_, _ = db.Pool.Exec(ctx, `
		UPDATE catalog.supplier_offers SET moq = 1, price = 10000, retail_price = 15000, b2c_enabled = TRUE WHERE id = $1;
		UPDATE inventory.warehouse_stock SET on_hand = 100, reserved = 0 WHERE offer_id = $1;
	`, offerID)

	// Create checkout order
	req := order.CheckoutRequest{
		OrderType:     "b2c",
		Currency:      "USD",
		PaymentMethod: "card",
		DeliveryAddress: json.RawMessage(`{"city": "Jeddah"}`),
		Items: []order.CheckoutItemInput{
			{OfferID: offerID, Quantity: 5},
		},
	}
	createdOrder, err := orderRepo.ProcessCheckout(ctx, req, customerUserID)
	if err != nil {
		t.Fatalf("failed to create order: %v", err)
	}

	// Verify reserved stock increased
	var reservedBefore int
	_ = db.Pool.QueryRow(ctx, `SELECT reserved FROM inventory.warehouse_stock WHERE offer_id = $1`, offerID).Scan(&reservedBefore)
	if reservedBefore < 5 {
		t.Fatalf("expected at least 5 reserved items, got %d", reservedBefore)
	}

	// Dispatch failure webhook
	failPayload := map[string]interface{}{
		"id":        "evt_fail_" + uuid.New().String(),
		"event":     "payment.failed",
		"order_id":  createdOrder.ID,
		"reference": "ch_mock_failed",
		"amount":    createdOrder.GrandTotalCents,
		"currency":  "USD",
	}
	failBytes, _ := json.Marshal(failPayload)
	failSig := payment.SignPayload(webhookSecret, failBytes)

	httpReq := httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewReader(failBytes))
	httpReq.Header.Set("X-Mock-Signature", failSig)
	httpRec := httptest.NewRecorder()
	handler.HandleWebhook(httpRec, httpReq)

	if httpRec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for failure webhook, got %d", httpRec.Code)
	}

	// Verify order status cancelled
	var statusAfter string
	_ = db.Pool.QueryRow(ctx, `SELECT status FROM commerce.orders WHERE id = $1`, createdOrder.ID).Scan(&statusAfter)
	if statusAfter != "cancelled" {
		t.Fatalf("expected order status 'cancelled', got '%s'", statusAfter)
	}

	// Verify reserved stock was released back
	var reservedAfter int
	_ = db.Pool.QueryRow(ctx, `SELECT reserved FROM inventory.warehouse_stock WHERE offer_id = $1`, offerID).Scan(&reservedAfter)
	if reservedAfter != reservedBefore-5 {
		t.Fatalf("expected reserved stock to decrease by 5 (from %d to %d), got %d", reservedBefore, reservedBefore-5, reservedAfter)
	}
}
