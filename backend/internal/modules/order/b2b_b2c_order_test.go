package order_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/order"
	"github.com/marketplace/core/internal/modules/wallet"
)

func TestB2CCheckoutRetailPricingAndMOQ1(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)

	offerID := "f0000000-0000-0000-0000-000000000001"
	customerUserID := "a0000000-0000-0000-0000-000000000004"

	// Configure offer: Wholesale MOQ = 5, Wholesale Price = 10000 cents ($100),
	// Retail B2C enabled = true, Retail Price = 15000 cents ($150)
	_, err = db.Pool.Exec(ctx, `
		UPDATE catalog.supplier_offers
		SET moq = 5, price = 10000, retail_price = 15000, b2c_enabled = TRUE, b2b_enabled = TRUE
		WHERE id = $1
	`, offerID)
	if err != nil {
		t.Fatalf("failed to prepare test offer: %v", err)
	}
	_, err = db.Pool.Exec(ctx, `
		UPDATE inventory.warehouse_stock
		SET on_hand = 100, reserved = 0
		WHERE offer_id = $1
	`, offerID)
	if err != nil {
		t.Fatalf("failed to prepare test stock: %v", err)
	}

	// 1. Retail B2C Checkout with quantity = 1 (below wholesale MOQ of 5)
	req := order.CheckoutRequest{
		OrderType:     "b2c",
		Currency:      "USD",
		PaymentMethod: "card",
		DeliveryAddress: json.RawMessage(`{
			"recipient_name": "Retail Consumer",
			"city": "Riyadh",
			"street": "Olaya St",
			"phone": "+966500000000"
		}`),
		Items: []order.CheckoutItemInput{
			{OfferID: offerID, Quantity: 1},
		},
	}

	parentOrder, err := orderRepo.ProcessCheckout(ctx, req, customerUserID)
	if err != nil {
		t.Fatalf("B2C checkout failed: %v", err)
	}

	if parentOrder.OrderType != "b2c" {
		t.Fatalf("expected order_type 'b2c', got '%s'", parentOrder.OrderType)
	}
	if parentOrder.MerchantID != "" {
		t.Fatalf("expected empty/null merchant_id for B2C order, got '%s'", parentOrder.MerchantID)
	}
	if parentOrder.UserID != customerUserID {
		t.Fatalf("expected user_id '%s', got '%s'", customerUserID, parentOrder.UserID)
	}

	// Subtotal must be calculated using retail_price (15000 cents), NOT wholesale (10000 cents)
	if parentOrder.SubtotalCents != 15000 {
		t.Fatalf("expected subtotal 15000 cents (retail price), got %d", parentOrder.SubtotalCents)
	}

	// Verify database record has merchant_id NULL and order_type 'b2c'
	var dbOrderType string
	var dbMerchantID *string
	err = db.Pool.QueryRow(ctx, `SELECT order_type, merchant_id FROM commerce.orders WHERE id = $1`, parentOrder.ID).Scan(&dbOrderType, &dbMerchantID)
	if err != nil {
		t.Fatalf("failed to query created order: %v", err)
	}
	if dbOrderType != "b2c" {
		t.Fatalf("expected db order_type 'b2c', got '%s'", dbOrderType)
	}
	if dbMerchantID != nil {
		t.Fatalf("expected db merchant_id NULL, got '%s'", *dbMerchantID)
	}
}

func TestB2CWalletCheckoutDebitsAccount2050(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)
	walletRepo := wallet.NewRepository(db.Pool)

	offerID := "f0000000-0000-0000-0000-000000000001"
	customerUserID := "a0000000-0000-0000-0000-000000000004"

	// Reset offer & stock
	_, err = db.Pool.Exec(ctx, `
		UPDATE catalog.supplier_offers
		SET moq = 1, price = 10000, retail_price = 12000, b2c_enabled = TRUE
		WHERE id = $1
	`, offerID)
	if err != nil {
		t.Fatalf("failed to configure test offer: %v", err)
	}
	_, err = db.Pool.Exec(ctx, `
		UPDATE inventory.warehouse_stock
		SET on_hand = 100, reserved = 0
		WHERE offer_id = $1
	`, offerID)
	if err != nil {
		t.Fatalf("failed to configure test stock: %v", err)
	}

	// 1. Top-up customer wallet (Account 2050) with sufficient funds
	topupAmount := int64(100000) // 1000.00 USD
	idemTopup := "cust-topup-" + time.Now().Format("20060102150405.000000")
	_, err = walletRepo.TopUpWallet(ctx, "customer", customerUserID, topupAmount, "USD", idemTopup)
	if err != nil {
		t.Fatalf("failed to top-up customer wallet: %v", err)
	}

	balBefore, err := walletRepo.GetWalletBalance(ctx, "customer", customerUserID)
	if err != nil {
		t.Fatalf("failed to get customer wallet balance: %v", err)
	}

	// 2. Perform B2C Wallet Checkout
	req := order.CheckoutRequest{
		OrderType:     "b2c",
		Currency:      "USD",
		PaymentMethod: "wallet",
		DeliveryAddress: json.RawMessage(`{
			"recipient_name": "Retail Consumer",
			"city": "Jeddah",
			"street": "Corniche",
			"phone": "+966500000000"
		}`),
		Items: []order.CheckoutItemInput{
			{OfferID: offerID, Quantity: 1},
		},
	}

	parentOrder, err := orderRepo.ProcessCheckout(ctx, req, customerUserID)
	if err != nil {
		t.Fatalf("B2C wallet checkout failed: %v", err)
	}

	// 3. Verify Account 2050 balance decreased by exact grand total
	balAfter, err := walletRepo.GetWalletBalance(ctx, "customer", customerUserID)
	if err != nil {
		t.Fatalf("failed to get customer wallet balance after checkout: %v", err)
	}

	expectedBal := balBefore.Balance - parentOrder.GrandTotalCents
	if balAfter.Balance != expectedBal {
		t.Fatalf("expected customer wallet balance %d, got %d (grand total was %d)", expectedBal, balAfter.Balance, parentOrder.GrandTotalCents)
	}

	// 4. Verify Double-Entry Journal Entry
	var jeID string
	err = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.journal_entries WHERE reference_id = $1 AND action = 'order_settlement'`, parentOrder.ID).Scan(&jeID)
	if err != nil {
		t.Fatalf("failed to find settlement journal entry: %v", err)
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
	var hasAccount2050Debit bool
	for rows.Next() {
		var code, entryType string
		var amt int64
		if err := rows.Scan(&code, &entryType, &amt); err != nil {
			t.Fatalf("failed to scan ledger line: %v", err)
		}
		if entryType == "debit" {
			debitSum += amt
			if code == "2050" {
				hasAccount2050Debit = true
			}
		} else {
			creditSum += amt
		}
	}

	if !hasAccount2050Debit {
		t.Fatalf("expected debit to Account 2050 (Customer Wallet Liability) on B2C wallet checkout")
	}
	if debitSum != creditSum || debitSum != parentOrder.GrandTotalCents {
		t.Fatalf("unbalanced journal entry: debits=%d, credits=%d, grand_total=%d", debitSum, creditSum, parentOrder.GrandTotalCents)
	}
}

func TestCrossChannelOrderIsolation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)

	merchantOrgID := "b0000000-0000-0000-0000-000000000004"
	customerUserID := "a0000000-0000-0000-0000-000000000004"

	// List B2B orders for merchant
	b2bOrders, err := orderRepo.ListOrders(ctx, "b2b", merchantOrgID, "")
	if err != nil {
		t.Fatalf("failed to list B2B orders: %v", err)
	}
	for _, o := range b2bOrders {
		if o.OrderType != "b2b" {
			t.Fatalf("expected order_type 'b2b', got '%s'", o.OrderType)
		}
		if o.MerchantID != merchantOrgID {
			t.Fatalf("expected merchant_id '%s', got '%s'", merchantOrgID, o.MerchantID)
		}
	}

	// List B2C orders for customer
	b2cOrders, err := orderRepo.ListOrders(ctx, "b2c", "", customerUserID)
	if err != nil {
		t.Fatalf("failed to list B2C orders: %v", err)
	}
	for _, o := range b2cOrders {
		if o.OrderType != "b2c" {
			t.Fatalf("expected order_type 'b2c', got '%s'", o.OrderType)
		}
		if o.UserID != customerUserID {
			t.Fatalf("expected user_id '%s', got '%s'", customerUserID, o.UserID)
		}
	}
}

func TestMerchantReceivingWarehousesCRUD(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)
	merchantOrgID := "b0000000-0000-0000-0000-000000000004"

	whCode := "WH-" + time.Now().Format("150405")

	// 1. Create Warehouse (DEP-08)
	wh, err := orderRepo.CreateMerchantWarehouse(ctx, merchantOrgID, order.CreateMerchantWarehouseRequest{
		Name:           "Central Logistics Hub",
		Code:           whCode,
		City:           "Riyadh",
		AddressLine:    "Exit 18, Ring Road Industrial Area",
		DockType:       "raised_dock",
		HasForklift:    true,
		ReceivingHours: "08:00 - 17:00 Sun-Thu",
		ContactName:    "Warehouse Manager",
		ContactPhone:   "+966512345678",
		IsDefault:      true,
	})
	if err != nil {
		t.Fatalf("failed to create merchant warehouse: %v", err)
	}

	if wh.ID == "" || wh.DockType != "raised_dock" || !wh.HasForklift {
		t.Fatalf("unexpected warehouse creation: %+v", wh)
	}

	// 2. List Warehouses
	warehouses, err := orderRepo.ListMerchantWarehouses(ctx, merchantOrgID)
	if err != nil {
		t.Fatalf("failed to list merchant warehouses: %v", err)
	}
	found := false
	for _, w := range warehouses {
		if w.ID == wh.ID {
			found = true
			if !w.IsDefault {
				t.Fatalf("expected is_default=true for new primary warehouse")
			}
			break
		}
	}
	if !found {
		t.Fatalf("created warehouse %s not found in listing", wh.ID)
	}

	// 3. Delete Warehouse
	err = orderRepo.DeleteMerchantWarehouse(ctx, merchantOrgID, wh.ID)
	if err != nil {
		t.Fatalf("failed to delete warehouse: %v", err)
	}

	// Verify marked inactive
	warehousesAfter, err := orderRepo.ListMerchantWarehouses(ctx, merchantOrgID)
	if err != nil {
		t.Fatalf("failed to list warehouses after deletion: %v", err)
	}
	for _, w := range warehousesAfter {
		if w.ID == wh.ID {
			t.Fatalf("deleted warehouse %s still returned in active list", wh.ID)
		}
	}
}

func TestCustomerAddressesCRUD(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)
	customerUserID := "a0000000-0000-0000-0000-000000000004"

	// 1. Create Address (DEP-07)
	addr, err := orderRepo.CreateCustomerAddress(ctx, customerUserID, order.CreateCustomerAddressRequest{
		Label:                "Home Villa",
		RecipientName:        "Tariq Consumer",
		RecipientPhone:       "+966555123456",
		City:                 "Riyadh",
		District:             "Al Malqa",
		StreetAddress:        "Anas Ibn Malik St",
		BuildingNumber:       "12A",
		FloorNumber:          "1",
		ApartmentNumber:      "2",
		PostalCode:           "13521",
		DeliveryInstructions: "Ring bell twice, leave at front door",
		IsDefault:            true,
	})
	if err != nil {
		t.Fatalf("failed to create customer address: %v", err)
	}

	if addr.ID == "" || addr.City != "Riyadh" || !addr.IsDefault {
		t.Fatalf("unexpected address: %+v", addr)
	}

	// 2. List Addresses
	addresses, err := orderRepo.ListCustomerAddresses(ctx, customerUserID)
	if err != nil {
		t.Fatalf("failed to list customer addresses: %v", err)
	}
	found := false
	for _, a := range addresses {
		if a.ID == addr.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("created address %s not found in listing", addr.ID)
	}

	// 3. Delete Address
	err = orderRepo.DeleteCustomerAddress(ctx, customerUserID, addr.ID)
	if err != nil {
		t.Fatalf("failed to delete address: %v", err)
	}

	// Verify deletion
	addressesAfter, err := orderRepo.ListCustomerAddresses(ctx, customerUserID)
	if err != nil {
		t.Fatalf("failed to list addresses after deletion: %v", err)
	}
	for _, a := range addressesAfter {
		if a.ID == addr.ID {
			t.Fatalf("deleted address %s still returned in list", addr.ID)
		}
	}
}
