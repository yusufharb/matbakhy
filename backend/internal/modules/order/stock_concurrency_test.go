package order_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/order"
)

func TestStockReservationExceedingOnHandFails(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping live database test: %v", err)
	}
	defer db.Close()

	// 1. Create a dedicated test offer and warehouse stock with on_hand = 5, reserved = 0
	supplierID := "b0000000-0000-0000-0000-000000000002"
	productID := "e0000000-0000-0000-0000-000000000001"
	warehouseID := "10000000-0000-0000-0000-000000000001"
	testOfferID := uuid.New().String()

	_, err = db.Pool.Exec(ctx, `
		INSERT INTO catalog.supplier_offers (id, supplier_id, product_id, supplier_sku, currency, price, moq, status)
		VALUES ($1, $2, $3, 'SUP-SKU-TEST', 'USD', 1000, 1, 'active')
	`, testOfferID, supplierID, productID)
	if err != nil {
		t.Fatalf("failed to insert test offer: %v", err)
	}

	_, err = db.Pool.Exec(ctx, `
		INSERT INTO inventory.warehouse_stock (id, warehouse_id, offer_id, on_hand, reserved)
		VALUES (gen_random_uuid(), $1, $2, 5, 0)
	`, warehouseID, testOfferID)
	if err != nil {
		t.Fatalf("failed to insert test stock: %v", err)
	}

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)

	// Attempt to order 6 units when only 5 are on_hand
	req := order.CheckoutRequest{
		MerchantID:    "b0000000-0000-0000-0000-000000000004",
		PaymentMethod: "gateway",
		Items: []order.CheckoutItemInput{
			{OfferID: testOfferID, Quantity: 6},
		},
	}

	_, err = orderRepo.ProcessCheckout(ctx, req, "a0000000-0000-0000-0000-000000000004")
	if err == nil {
		t.Fatalf("OVERSELLING BUG: checkout succeeded when ordering 6 units with only 5 on_hand!")
	}
}

func TestConcurrentCheckoutsPreventOverselling(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping live database test: %v", err)
	}
	defer db.Close()

	supplierID := "b0000000-0000-0000-0000-000000000002"
	productID := "e0000000-0000-0000-0000-000000000001"
	warehouseID := "10000000-0000-0000-0000-000000000001"
	testOfferID := uuid.New().String()

	// Stock: Exactly 5 units on hand
	totalStock := 5
	_, err = db.Pool.Exec(ctx, `
		INSERT INTO catalog.supplier_offers (id, supplier_id, product_id, supplier_sku, currency, price, moq, status)
		VALUES ($1, $2, $3, 'SUP-CONCUR-1', 'USD', 1000, 1, 'active')
	`, testOfferID, supplierID, productID)
	if err != nil {
		t.Fatalf("failed to insert test offer: %v", err)
	}

	_, err = db.Pool.Exec(ctx, `
		INSERT INTO inventory.warehouse_stock (id, warehouse_id, offer_id, on_hand, reserved)
		VALUES (gen_random_uuid(), $1, $2, $3, 0)
	`, warehouseID, testOfferID, totalStock)
	if err != nil {
		t.Fatalf("failed to insert test stock: %v", err)
	}

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)

	// Launch 15 concurrent buyers for 5 units of stock (1 unit each)
	totalBuyers := 15
	var successCount int32
	var failureCount int32

	var wg sync.WaitGroup
	wg.Add(totalBuyers)

	for i := 0; i < totalBuyers; i++ {
		go func(buyerIdx int) {
			defer wg.Done()
			req := order.CheckoutRequest{
				MerchantID:    "b0000000-0000-0000-0000-000000000004",
				PaymentMethod: "gateway",
				Items: []order.CheckoutItemInput{
					{OfferID: testOfferID, Quantity: 1},
				},
			}
			_, err := orderRepo.ProcessCheckout(ctx, req, "a0000000-0000-0000-0000-000000000004")
			if err == nil {
				atomic.AddInt32(&successCount, 1)
			} else {
				atomic.AddInt32(&failureCount, 1)
			}
		}(i)
	}

	wg.Wait()

	// Verify exact stock reservation: exactly totalStock succeeded
	if int(successCount) != totalStock {
		t.Fatalf("concurrency invariant violated: expected exactly %d successful checkouts, got %d (failures: %d)",
			totalStock, successCount, failureCount)
	}

	// Verify warehouse stock reserved does not exceed on_hand
	var finalOnHand, finalReserved int
	err = db.Pool.QueryRow(ctx, `
		SELECT on_hand, reserved FROM inventory.warehouse_stock
		WHERE offer_id = $1
	`, testOfferID).Scan(&finalOnHand, &finalReserved)
	if err != nil {
		t.Fatalf("failed to query final stock: %v", err)
	}

	if finalReserved > finalOnHand {
		t.Fatalf("OVERSELLING DETECTED: reserved (%d) exceeds on_hand (%d)", finalReserved, finalOnHand)
	}
	if finalReserved != totalStock {
		t.Fatalf("expected reserved to equal %d, got %d", totalStock, finalReserved)
	}
	fmt.Printf("Concurrency stock test verified: %d buyers competed, %d succeeded, %d rejected, reserved=%d/%d\n",
		totalBuyers, successCount, failureCount, finalReserved, finalOnHand)
}
