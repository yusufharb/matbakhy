package order_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/invoice"
	"github.com/marketplace/core/internal/modules/order"
	"github.com/marketplace/core/internal/modules/payment"
)

func TestMROIndustrialWholesaleB2BOrderWithDockAndTier(t *testing.T) {
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
	invGen := invoice.NewGenerator(db.Pool)

	merchantOrgID := "b0000000-0000-0000-0000-000000000002"
	merchantUserID := "a0000000-0000-0000-0000-000000000002"
	boschOfferID := "f0000000-0000-0000-0000-000000000021"

	// 1. Reset stock
	_, _ = db.Pool.Exec(ctx, `UPDATE inventory.warehouse_stock SET on_hand = 150, reserved = 0 WHERE offer_id = $1`, boschOfferID)

	// 2. Place B2B Wholesale Order for 25 units (Tier 2 pricing: 22,500 cents per unit)
	qty := 25
	b2bReq := order.CheckoutRequest{
		OrderType:     "b2b",
		MerchantID:    merchantOrgID,
		Currency:      "USD",
		PaymentMethod: "card",
		DeliveryAddress: json.RawMessage(`{
			"dock_id": "20000000-0000-0000-0000-000000000031",
			"dock_name": "Riyadh Industrial City 2 Central Receiving Dock",
			"has_forklift": true,
			"receiving_hours": "07:00 - 16:00"
		}`),
		Items: []order.CheckoutItemInput{
			{OfferID: boschOfferID, Quantity: qty},
		},
	}

	b2bOrder, err := orderRepo.ProcessCheckout(ctx, b2bReq, merchantUserID)
	if err != nil {
		t.Fatalf("failed to place B2B wholesale order: %v", err)
	}

	// Verify volume tier discount: 25 * 22,500 = 562,500 cents
	expectedSubtotal := int64(25 * 22500)
	if b2bOrder.SubtotalCents != expectedSubtotal {
		t.Fatalf("expected tier 2 wholesale subtotal %d, got %d", expectedSubtotal, b2bOrder.SubtotalCents)
	}

	// 3. Prepare order as pending_payment for 2-phase settlement
	_, _ = db.Pool.Exec(ctx, `UPDATE commerce.orders SET status = 'pending_payment' WHERE id = $1`, b2bOrder.ID)
	_, _ = db.Pool.Exec(ctx, `UPDATE commerce.payments SET status = 'pending', gateway_reference = NULL WHERE order_id = $1`, b2bOrder.ID)
	_, _ = db.Pool.Exec(ctx, `DELETE FROM ledger.lines WHERE journal_entry_id IN (SELECT id FROM ledger.journal_entries WHERE reference_id = $1)`, b2bOrder.ID)
	_, _ = db.Pool.Exec(ctx, `DELETE FROM ledger.journal_entries WHERE reference_id = $1`, b2bOrder.ID)

	// Settle via Payment Webhook
	settleEvt := payment.WebhookEvent{
		ID:               "evt_b2b_mro_" + b2bOrder.ID[:8],
		EventType:        "payment.succeeded",
		Gateway:          "mock",
		GatewayReference: "ch_mro_industrial_contractor",
		OrderID:          b2bOrder.ID,
		AmountCents:      b2bOrder.GrandTotalCents,
		Currency:         "USD",
		OccurredAt:       time.Now().UTC(),
	}
	err = payRepo.SettlePaymentWebhook(ctx, settleEvt)
	if err != nil {
		t.Fatalf("failed to settle B2B payment webhook: %v", err)
	}

	// 4. Generate B2B Corporate Tax Invoice
	taxInv, err := invGen.GenerateInvoice(ctx, b2bOrder.ID)
	if err != nil {
		t.Fatalf("failed to generate B2B tax invoice: %v", err)
	}

	if taxInv.InvoiceType != "tax_invoice" {
		t.Fatalf("expected invoice_type 'tax_invoice' for B2B, got: %s", taxInv.InvoiceType)
	}
	if taxInv.SellerTaxID == "" || taxInv.BuyerName == "" {
		t.Fatalf("expected buyer and seller tax info on B2B invoice: %+v", taxInv)
	}
	if taxInv.QRCodeTLV == "" {
		t.Fatalf("expected valid TLV QR code on B2B tax invoice")
	}
}
