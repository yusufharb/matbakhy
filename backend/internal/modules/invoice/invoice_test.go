package invoice_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/invoice"
	"github.com/marketplace/core/internal/modules/order"
)

func TestInvoiceGenerationAndTLV(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)
	gen := invoice.NewGenerator(db.Pool)

	offerID := "f0000000-0000-0000-0000-000000000001"
	customerUserID := "a0000000-0000-0000-0000-000000000004"

	// Reset offer & stock
	_, _ = db.Pool.Exec(ctx, `
		UPDATE catalog.supplier_offers SET moq = 1, price = 10000, retail_price = 15000, b2c_enabled = TRUE WHERE id = $1;
		UPDATE inventory.warehouse_stock SET on_hand = 100, reserved = 0 WHERE offer_id = $1;
	`, offerID)

	// Create B2C retail order
	req := order.CheckoutRequest{
		OrderType:     "b2c",
		Currency:      "USD",
		PaymentMethod: "card",
		DeliveryAddress: json.RawMessage(`{"city": "Riyadh", "street": "Tahlia"}`),
		Items: []order.CheckoutItemInput{
			{OfferID: offerID, Quantity: 2},
		},
	}
	createdOrder, err := orderRepo.ProcessCheckout(ctx, req, customerUserID)
	if err != nil {
		t.Fatalf("failed to create checkout order: %v", err)
	}

	// 1. Generate Tax Invoice
	inv, err := gen.GenerateInvoice(ctx, createdOrder.ID)
	if err != nil {
		t.Fatalf("failed to generate tax invoice: %v", err)
	}

	if inv.ID == "" || inv.InvoiceNumber == "" {
		t.Fatalf("unexpected invoice record: %+v", inv)
	}
	if inv.InvoiceType != "simplified_tax_invoice" {
		t.Fatalf("expected simplified_tax_invoice for B2C order, got: %s", inv.InvoiceType)
	}
	if inv.TaxCents <= 0 {
		t.Fatalf("expected positive tax calculation, got: %d", inv.TaxCents)
	}
	if inv.TaxCents+inv.SubtotalCents != inv.GrandTotalCents {
		t.Fatalf("tax (%d) + subtotal (%d) != grand total (%d)", inv.TaxCents, inv.SubtotalCents, inv.GrandTotalCents)
	}

	// 2. Validate Base64 TLV QR Code
	decodedTLV, err := base64.StdEncoding.DecodeString(inv.QRCodeTLV)
	if err != nil {
		t.Fatalf("invalid base64 in QR code TLV: %v", err)
	}
	if len(decodedTLV) < 10 {
		t.Fatalf("decoded TLV string too short: %d bytes", len(decodedTLV))
	}

	// 3. Test Retrieve Invoice by Order ID
	fetched, err := gen.GetInvoiceByOrderID(ctx, createdOrder.ID)
	if err != nil {
		t.Fatalf("failed to fetch invoice by order_id: %v", err)
	}
	if fetched.ID != inv.ID || fetched.InvoiceNumber != inv.InvoiceNumber {
		t.Fatalf("mismatched invoice retrieved: %+v vs %+v", fetched, inv)
	}
}
