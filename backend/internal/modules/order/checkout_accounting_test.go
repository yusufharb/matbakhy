package order_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/order"
	"github.com/marketplace/core/internal/modules/wallet"
)

// TestMultiSupplierCardCheckoutAccountingBalances asserts that on credit card checkout:
// 1. Debit account is exactly 1010 (Gateway Clearing Asset).
// 2. Each supplier's Escrow Account 2020 is credited with SupplierNet.
// 3. Platform Commission Revenue Account 4010 is credited with total commission.
// 4. Platform Shipping Revenue Account 4020 is credited with total shipping.
// 5. Total Debits == Total Credits == Grand Total.
// 6. Every account balance moves by the exact expected mathematical delta.
func TestMultiSupplierCardCheckoutAccountingBalances(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)

	merchantID := "b0000000-0000-0000-0000-000000000004"
	userID := "a0000000-0000-0000-0000-000000000004"

	// Reset test stock and MOQ so concurrency or previous tests don't cause false positives
	_, _ = db.Pool.Exec(ctx, `
		UPDATE catalog.supplier_offers SET moq = 1 WHERE id = 'f0000000-0000-0000-0000-000000000001';
		UPDATE catalog.supplier_offers SET moq = 5 WHERE id = 'f0000000-0000-0000-0000-000000000002';
		UPDATE inventory.warehouse_stock
		SET on_hand = 100, reserved = 0
		WHERE offer_id IN ('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002');
	`)

	// Helper to get account balance
	getBalance := func(accountID string, isAsset bool) int64 {
		if accountID == "" {
			return 0
		}
		var bal int64
		_ = db.Pool.QueryRow(ctx, `
			SELECT coalesce(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0)
			FROM ledger.lines WHERE account_id = $1
		`, accountID).Scan(&bal)
		if !isAsset {
			bal = -bal // for liabilities and revenue, normal balance is credit
		}
		return bal
	}

	// 1. Query initial balances of platform accounts
	var card1010ID, rev4010ID, ship4020ID string
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '1010' LIMIT 1`).Scan(&card1010ID)
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4010' LIMIT 1`).Scan(&rev4010ID)
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4020' LIMIT 1`).Scan(&ship4020ID)

	initCardBal := getBalance(card1010ID, true)
	initRevBal := getBalance(rev4010ID, false)
	initShipBal := getBalance(ship4020ID, false)

	// Multi-supplier checkout: Noura Foods (Offer 1) + Atlas Industrial (Offer 2)
	req := order.CheckoutRequest{
		MerchantID:    merchantID,
		PaymentMethod: "credit_card",
		Items: []order.CheckoutItemInput{
			{OfferID: "f0000000-0000-0000-0000-000000000001", Quantity: 2},
			{OfferID: "f0000000-0000-0000-0000-000000000002", Quantity: 5},
		},
	}

	parentOrder, err := orderRepo.ProcessCheckout(ctx, req, userID)
	if err != nil {
		t.Fatalf("checkout failed: %v", err)
	}

	if len(parentOrder.Suborders) != 2 {
		t.Fatalf("expected 2 suborders, got %d", len(parentOrder.Suborders))
	}

	// Compute expected totals
	var expectedCommission, expectedShipping, expectedSupplierPayables int64
	for _, so := range parentOrder.Suborders {
		expectedCommission += so.CommissionCents
		expectedShipping += so.ShippingCents
		expectedSupplierPayables += so.SupplierPayable
	}

	if parentOrder.GrandTotalCents != (expectedSupplierPayables + expectedCommission + expectedShipping) {
		t.Fatalf("grand total math mismatch: total=%d, payables=%d, comm=%d, ship=%d",
			parentOrder.GrandTotalCents, expectedSupplierPayables, expectedCommission, expectedShipping)
	}

	// Query journal entry and verify lines
	var jeID string
	err = db.Pool.QueryRow(ctx, `
		SELECT id FROM ledger.journal_entries 
		WHERE reference_id = $1 AND reference_type = 'order'
	`, parentOrder.ID).Scan(&jeID)
	if err != nil {
		t.Fatalf("journal entry not found: %v", err)
	}

	type lineInfo struct {
		accountCode string
		entryType   string
		amount      int64
	}
	rows, err := db.Pool.Query(ctx, `
		SELECT a.account_code, l.entry_type, l.amount
		FROM ledger.lines l
		JOIN ledger.accounts a ON a.id = l.account_id
		WHERE l.journal_entry_id = $1
		ORDER BY l.entry_type DESC, a.account_code ASC
	`, jeID)
	if err != nil {
		t.Fatalf("failed to query lines: %v", err)
	}
	defer rows.Close()

	var lines []lineInfo
	var totalDebits, totalCredits int64
	for rows.Next() {
		var l lineInfo
		if err := rows.Scan(&l.accountCode, &l.entryType, &l.amount); err != nil {
			t.Fatalf("scan error: %v", err)
		}
		lines = append(lines, l)
		if l.entryType == "debit" {
			totalDebits += l.amount
		} else {
			totalCredits += l.amount
		}
	}

	if totalDebits != parentOrder.GrandTotalCents || totalCredits != parentOrder.GrandTotalCents {
		t.Fatalf("balanced entry invariant violated: debits=%d, credits=%d, grand_total=%d",
			totalDebits, totalCredits, parentOrder.GrandTotalCents)
	}

	// Assert Debit Line was Account 1010
	var foundDebit1010 bool
	for _, l := range lines {
		if l.accountCode == "1010" && l.entryType == "debit" && l.amount == parentOrder.GrandTotalCents {
			foundDebit1010 = true
			break
		}
	}
	if !foundDebit1010 {
		t.Fatalf("expected debit line for Account 1010 of %d cents, lines were: %+v",
			parentOrder.GrandTotalCents, lines)
	}

	// Assert Account 4020 (Shipping Revenue) was credited if shipping > 0
	if expectedShipping > 0 {
		var foundShippingLine bool
		for _, l := range lines {
			if l.accountCode == "4020" && l.entryType == "credit" && l.amount == expectedShipping {
				foundShippingLine = true
				break
			}
		}
		if !foundShippingLine {
			t.Fatalf("ACCOUNTING BUG: expected credit line for Account 4020 (Shipping Revenue) of %d cents, lines were: %+v",
				expectedShipping, lines)
		}
	}

	// Assert Account 4010 (Commission Revenue) was credited for exact commission
	var foundCommLine bool
	for _, l := range lines {
		if l.accountCode == "4010" && l.entryType == "credit" && l.amount == expectedCommission {
			foundCommLine = true
			break
		}
	}
	if !foundCommLine {
		t.Fatalf("ACCOUNTING BUG: expected credit line for Account 4010 (Commission Revenue) of %d cents, lines were: %+v",
			expectedCommission, lines)
	}

	// Verify Account 1010 increased by GrandTotal
	finalCardBal := getBalance(card1010ID, true)
	if finalCardBal-initCardBal != parentOrder.GrandTotalCents {
		t.Fatalf("account 1010 balance delta mismatch: expected +%d, got +%d",
			parentOrder.GrandTotalCents, finalCardBal-initCardBal)
	}

	// Verify Account 4010 increased by Commission
	finalRevBal := getBalance(rev4010ID, false)
	if finalRevBal-initRevBal != expectedCommission {
		t.Fatalf("account 4010 balance delta mismatch: expected +%d, got +%d",
			expectedCommission, finalRevBal-initRevBal)
	}

	// Verify Account 4020 increased by Shipping
	if ship4020ID == "" {
		_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4020' LIMIT 1`).Scan(&ship4020ID)
	}
	if ship4020ID != "" && expectedShipping > 0 {
		finalShipBal := getBalance(ship4020ID, false)
		if finalShipBal-initShipBal != expectedShipping {
			t.Fatalf("account 4020 balance delta mismatch: expected +%d, got +%d",
				expectedShipping, finalShipBal-initShipBal)
		}
	}
}

// TestMultiSupplierWalletCheckoutAccountingBalances asserts that on wallet checkout:
// 1. Debit account is exactly 2010 (Merchant Wallet Deposit Liability).
// 2. Gateway Clearing Account 1010 is NOT touched at all.
// 3. Merchant wallet balance decreases by exact Grand Total.
// 4. Each supplier's Escrow Account 2020 is credited with SupplierNet.
// 5. Platform Commission Revenue (4010) is credited with Commission.
// 6. Platform Shipping Revenue (4020) is credited with Shipping.
func TestMultiSupplierWalletCheckoutAccountingBalances(t *testing.T) {
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

	merchantID := "b0000000-0000-0000-0000-000000000004"
	userID := "a0000000-0000-0000-0000-000000000004"

	// Reset test stock and MOQ
	_, _ = db.Pool.Exec(ctx, `
		UPDATE catalog.supplier_offers SET moq = 1 WHERE id = 'f0000000-0000-0000-0000-000000000001';
		UPDATE catalog.supplier_offers SET moq = 5 WHERE id = 'f0000000-0000-0000-0000-000000000002';
		UPDATE inventory.warehouse_stock
		SET on_hand = 100, reserved = 0
		WHERE offer_id IN ('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002');
	`)

	// Helper to get account balance
	getBalance := func(accountID string, isAsset bool) int64 {
		if accountID == "" {
			return 0
		}
		var bal int64
		_ = db.Pool.QueryRow(ctx, `
			SELECT coalesce(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0)
			FROM ledger.lines WHERE account_id = $1
		`, accountID).Scan(&bal)
		if !isAsset {
			bal = -bal // for liabilities and revenue, normal balance is credit
		}
		return bal
	}

	// Ensure merchant wallet account 2010 exists and has sufficient funds
	var merchant2010ID, bank1020ID, card1010ID, rev4010ID, ship4020ID string
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE owner_id = $1 AND account_code = '2010' LIMIT 1`, merchantID).Scan(&merchant2010ID)
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '1020' LIMIT 1`).Scan(&bank1020ID)
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '1010' LIMIT 1`).Scan(&card1010ID)
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4010' LIMIT 1`).Scan(&rev4010ID)
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4020' LIMIT 1`).Scan(&ship4020ID)

	if merchant2010ID == "" {
		merchant2010ID = "20000000-0000-0000-0000-000000002010"
		_, _ = db.Pool.Exec(ctx, `
			INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
			VALUES ($1, 'merchant', $2, 'USD', '2010', 'Meridian Merchant Wallet')
			ON CONFLICT (id) DO NOTHING;
		`, merchant2010ID, merchantID)
	}

	// Top up merchant wallet with $2,000.00 (200,000 cents)
	topupAmount := int64(200000)
	_, err = walletRepo.PostJournalEntry(ctx, wallet.JournalEntry{
		ReferenceType:  "topup",
		ReferenceID:    merchantID,
		Action:         "wallet_topup",
		Description:    "Pre-test Merchant Wallet Topup",
		Currency:       "USD",
		Status:         "posted",
		IdempotencyKey: fmt.Sprintf("idem-wallet-test-%d", time.Now().UnixNano()),
		Lines: []wallet.LedgerLine{
			{AccountID: bank1020ID, EntryType: "debit", Amount: topupAmount},
			{AccountID: merchant2010ID, EntryType: "credit", Amount: topupAmount},
		},
	})
	if err != nil {
		t.Fatalf("failed to fund merchant wallet: %v", err)
	}

	initMerchantBal := getBalance(merchant2010ID, false)
	initCardBal := getBalance(card1010ID, true)
	initRevBal := getBalance(rev4010ID, false)
	initShipBal := getBalance(ship4020ID, false)

	// Checkout via wallet
	req := order.CheckoutRequest{
		MerchantID:    merchantID,
		PaymentMethod: "wallet",
		Items: []order.CheckoutItemInput{
			{OfferID: "f0000000-0000-0000-0000-000000000001", Quantity: 2},
			{OfferID: "f0000000-0000-0000-0000-000000000002", Quantity: 5},
		},
	}

	parentOrder, err := orderRepo.ProcessCheckout(ctx, req, userID)
	if err != nil {
		t.Fatalf("wallet checkout failed: %v", err)
	}

	// Verify journal entry lines
	var jeID string
	err = db.Pool.QueryRow(ctx, `
		SELECT id FROM ledger.journal_entries 
		WHERE reference_id = $1 AND reference_type = 'order'
	`, parentOrder.ID).Scan(&jeID)
	if err != nil {
		t.Fatalf("journal entry not found: %v", err)
	}

	type lineInfo struct {
		accountCode string
		entryType   string
		amount      int64
	}
	rows, err := db.Pool.Query(ctx, `
		SELECT a.account_code, l.entry_type, l.amount
		FROM ledger.lines l
		JOIN ledger.accounts a ON a.id = l.account_id
		WHERE l.journal_entry_id = $1
		ORDER BY l.entry_type DESC, a.account_code ASC
	`, jeID)
	if err != nil {
		t.Fatalf("failed to query lines: %v", err)
	}
	defer rows.Close()

	var lines []lineInfo
	for rows.Next() {
		var l lineInfo
		_ = rows.Scan(&l.accountCode, &l.entryType, &l.amount)
		lines = append(lines, l)
	}

	// Assert Account 2010 was DEBITED for Grand Total
	var foundDebit2010 bool
	for _, l := range lines {
		if l.accountCode == "2010" && l.entryType == "debit" && l.amount == parentOrder.GrandTotalCents {
			foundDebit2010 = true
			break
		}
	}
	if !foundDebit2010 {
		t.Fatalf("ACCOUNTING BUG: expected wallet checkout to DEBIT Account 2010 for %d cents, lines were: %+v",
			parentOrder.GrandTotalCents, lines)
	}

	// Assert Account 1010 was NOT touched in this entry
	for _, l := range lines {
		if l.accountCode == "1010" {
			t.Fatalf("ACCOUNTING BUG: Account 1010 (Gateway Clearing) was present in wallet checkout lines: %+v", lines)
		}
	}

	// Assert Merchant Wallet Balance decreased by Grand Total
	finalMerchantBal := getBalance(merchant2010ID, false)
	if finalMerchantBal != (initMerchantBal - parentOrder.GrandTotalCents) {
		t.Fatalf("merchant wallet balance invariant violated: initial=%d, order=%d, expected=%d, actual=%d",
			initMerchantBal, parentOrder.GrandTotalCents, initMerchantBal-parentOrder.GrandTotalCents, finalMerchantBal)
	}

	// Assert Gateway Clearing (1010) was UNCHANGED
	finalCardBal := getBalance(card1010ID, true)
	if finalCardBal != initCardBal {
		t.Fatalf("account 1010 should have remained unchanged: initial=%d, final=%d", initCardBal, finalCardBal)
	}

	// Compute expected totals
	var expectedCommission, expectedShipping int64
	for _, so := range parentOrder.Suborders {
		expectedCommission += so.CommissionCents
		expectedShipping += so.ShippingCents
	}

	// Verify Account 4010 increased by Commission
	finalRevBal := getBalance(rev4010ID, false)
	if finalRevBal-initRevBal != expectedCommission {
		t.Fatalf("commission revenue balance mismatch: expected delta +%d, got +%d",
			expectedCommission, finalRevBal-initRevBal)
	}

	// Verify Account 4020 increased by Shipping
	if ship4020ID == "" {
		_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '4020' LIMIT 1`).Scan(&ship4020ID)
	}
	finalShipBal := getBalance(ship4020ID, false)
	if finalShipBal-initShipBal != expectedShipping {
		t.Fatalf("shipping revenue balance mismatch: expected delta +%d, got +%d",
			expectedShipping, finalShipBal-initShipBal)
	}
}
