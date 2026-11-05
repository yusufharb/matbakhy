package order_test

import (
	"context"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/order"
)

func TestCheckoutMOQValidation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)

	// Offer f0000000-0000-0000-0000-000000000002 has MOQ 5
	// Ordering 1 should fail
	req := order.CheckoutRequest{
		MerchantID:    "b0000000-0000-0000-0000-000000000004",
		PaymentMethod: "wallet",
		Items: []order.CheckoutItemInput{
			{OfferID: "f0000000-0000-0000-0000-000000000002", Quantity: 1}, // Below MOQ of 5
		},
	}

	_, err = orderRepo.ProcessCheckout(ctx, req, "a0000000-0000-0000-0000-000000000004")
	if err == nil {
		t.Fatalf("expected MOQ validation error when requesting quantity below MOQ")
	}
}

func TestSuccessfulCheckoutAndSplitting(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)

	// Valid order with 2 vendors:
	// Noura Foods (MOQ 1): 2 units
	// Atlas Industrial (MOQ 5): 5 units
	_, _ = db.Pool.Exec(ctx, `
		UPDATE catalog.supplier_offers SET moq = 1 WHERE id = 'f0000000-0000-0000-0000-000000000001';
		UPDATE catalog.supplier_offers SET moq = 5 WHERE id = 'f0000000-0000-0000-0000-000000000002';
	`)

	req := order.CheckoutRequest{
		MerchantID:    "b0000000-0000-0000-0000-000000000004",
		PaymentMethod: "credit_card",
		Items: []order.CheckoutItemInput{
			{OfferID: "f0000000-0000-0000-0000-000000000001", Quantity: 2},
			{OfferID: "f0000000-0000-0000-0000-000000000002", Quantity: 5},
		},
	}

	parentOrder, err := orderRepo.ProcessCheckout(ctx, req, "a0000000-0000-0000-0000-000000000004")
	if err != nil {
		t.Fatalf("checkout failed: %v", err)
	}

	if len(parentOrder.Suborders) != 2 {
		t.Fatalf("expected order to be partitioned into 2 suborders, got %d", len(parentOrder.Suborders))
	}

	if parentOrder.Status != "confirmed" {
		t.Fatalf("expected confirmed status, got %s", parentOrder.Status)
	}
}
