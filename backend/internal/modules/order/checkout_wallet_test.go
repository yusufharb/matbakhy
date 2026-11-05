package order_test

import (
	"context"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/commission"
	"github.com/marketplace/core/internal/modules/order"
)

// TestWalletCheckoutDebitsAccount2010 verifies:
// 1. Wallet checkout debits account 2010 (merchant wallet liability), NOT account 1010.
// 2. Merchant wallet balance decreases by the grand total.
func TestWalletCheckoutDebitsAccount2010(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	merchantID := "b0000000-0000-0000-0000-000000000004"
	userID := "a0000000-0000-0000-0000-000000000004"

	// 1. Ensure merchant has an Account 2010 with known initial balance
	var merchantAccount2010ID string
	err = db.Pool.QueryRow(ctx, `
		SELECT id FROM ledger.accounts 
		WHERE owner_id = $1 AND account_code = '2010'
		LIMIT 1
	`, merchantID).Scan(&merchantAccount2010ID)

	if err != nil {
		// Create merchant wallet account 2010
		err = db.Pool.QueryRow(ctx, `
			INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
			VALUES (gen_random_uuid(), 'merchant', $1, 'USD', '2010', 'Meridian Merchant Wallet')
			RETURNING id
		`, merchantID).Scan(&merchantAccount2010ID)
		if err != nil {
			t.Fatalf("failed to create merchant wallet account 2010: %v", err)
		}
	}

	// Calculate merchant wallet balance before checkout:
	// For liability 2010: balance = SUM(credit - debit)
	var initialBalance int64
	_ = db.Pool.QueryRow(ctx, `
		SELECT coalesce(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
		FROM ledger.lines
		WHERE account_id = $1
	`, merchantAccount2010ID).Scan(&initialBalance)

	// If initial balance is lower than order amount, credit initial funds for test in a transaction
	if initialBalance < 50000 {
		txTopup, err := db.Pool.Begin(ctx)
		if err != nil {
			t.Fatalf("failed to start topup tx: %v", err)
		}
		topupJEID := ""
		err = txTopup.QueryRow(ctx, `
			INSERT INTO ledger.journal_entries (id, entry_number, reference_type, reference_id, action, description, currency, status, idempotency_key)
			VALUES (gen_random_uuid(), 'JE-TEST-TOPUP-' || floor(random()*1000000)::text, 'topup', $1, 'wallet_topup', 'Test Topup', 'USD', 'posted', 'idem-topup-' || gen_random_uuid()::text)
			RETURNING id
		`, merchantID).Scan(&topupJEID)
		if err != nil {
			txTopup.Rollback(ctx)
			t.Fatalf("failed to create topup JE: %v", err)
		}

		// Debit bank 1020, Credit wallet 2010
		var bankAccID string
		_ = txTopup.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '1020' LIMIT 1`).Scan(&bankAccID)
		_, err = txTopup.Exec(ctx, `INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount) VALUES (gen_random_uuid(), $1, $2, 'debit', 100000)`, topupJEID, bankAccID)
		if err != nil {
			txTopup.Rollback(ctx)
			t.Fatalf("failed to insert topup debit: %v", err)
		}
		_, err = txTopup.Exec(ctx, `INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount) VALUES (gen_random_uuid(), $1, $2, 'credit', 100000)`, topupJEID, merchantAccount2010ID)
		if err != nil {
			txTopup.Rollback(ctx)
			t.Fatalf("failed to insert topup credit: %v", err)
		}
		if err := txTopup.Commit(ctx); err != nil {
			t.Fatalf("failed to commit topup tx: %v", err)
		}

		_ = db.Pool.QueryRow(ctx, `
			SELECT coalesce(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
			FROM ledger.lines
			WHERE account_id = $1
		`, merchantAccount2010ID).Scan(&initialBalance)
	}

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)

	req := order.CheckoutRequest{
		MerchantID:    merchantID,
		PaymentMethod: "wallet",
		Items: []order.CheckoutItemInput{
			{OfferID: "f0000000-0000-0000-0000-000000000001", Quantity: 1},
		},
	}

	parentOrder, err := orderRepo.ProcessCheckout(ctx, req, userID)
	if err != nil {
		t.Fatalf("checkout failed: %v", err)
	}

	// 2. Query the journal entry for this order
	var jeID string
	err = db.Pool.QueryRow(ctx, `
		SELECT id FROM ledger.journal_entries 
		WHERE reference_id = $1 AND reference_type = 'order'
	`, parentOrder.ID).Scan(&jeID)
	if err != nil {
		t.Fatalf("journal entry not found for order: %v", err)
	}

	// 3. Find the debit line of this journal entry
	var debitAccountCode string
	var debitAccountID string
	var debitAmount int64
	err = db.Pool.QueryRow(ctx, `
		SELECT a.account_code, a.id, l.amount
		FROM ledger.lines l
		JOIN ledger.accounts a ON a.id = l.account_id
		WHERE l.journal_entry_id = $1 AND l.entry_type = 'debit'
	`, jeID).Scan(&debitAccountCode, &debitAccountID, &debitAmount)
	if err != nil {
		t.Fatalf("failed to query debit line: %v", err)
	}

	// REGRESSION ASSERTION: The debit account must be 2010 (Merchant Wallet), NOT 1010 (Clearing)
	if debitAccountCode != "2010" {
		t.Fatalf("REGRESSION BUG DETECTED: wallet checkout debited account %s instead of 2010 (merchant wallet liability)", debitAccountCode)
	}

	if debitAccountID != merchantAccount2010ID {
		t.Fatalf("expected debit account ID to match merchant wallet %s, got %s", merchantAccount2010ID, debitAccountID)
	}

	if debitAmount != parentOrder.GrandTotalCents {
		t.Fatalf("expected debit amount %d to equal grand total %d", debitAmount, parentOrder.GrandTotalCents)
	}

	// 4. Verify that merchant wallet balance decreased by exactly parentGrandTotal
	var finalBalance int64
	_ = db.Pool.QueryRow(ctx, `
		SELECT coalesce(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
		FROM ledger.lines
		WHERE account_id = $1
	`, merchantAccount2010ID).Scan(&finalBalance)

	expectedFinal := initialBalance - parentOrder.GrandTotalCents
	if finalBalance != expectedFinal {
		t.Fatalf("merchant wallet balance invariant violated: initial=%d, order=%d, expected final=%d, actual final=%d",
			initialBalance, parentOrder.GrandTotalCents, expectedFinal, finalBalance)
	}
}

// TestCheckoutDynamicCurrency verifies that non-USD currency (e.g. SAR) propagates everywhere:
// order, payment, and journal entry records must reflect the explicit currency.
func TestCheckoutDynamicCurrency(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	merchantID := "b0000000-0000-0000-0000-000000000004"
	userID := "a0000000-0000-0000-0000-000000000004"
	targetCurrency := "SAR"

	commRepo := commission.NewRepository(db.Pool)
	orderRepo := order.NewRepository(db.Pool, commRepo)

	req := order.CheckoutRequest{
		MerchantID:    merchantID,
		Currency:      targetCurrency,
		PaymentMethod: "gateway",
		Items: []order.CheckoutItemInput{
			{OfferID: "f0000000-0000-0000-0000-000000000001", Quantity: 1},
		},
	}

	parentOrder, err := orderRepo.ProcessCheckout(ctx, req, userID)
	if err != nil {
		t.Fatalf("checkout failed: %v", err)
	}

	if parentOrder.Currency != targetCurrency {
		t.Fatalf("expected order currency %s, got %s", targetCurrency, parentOrder.Currency)
	}

	// Verify database record has 'SAR'
	var dbOrderCurrency string
	err = db.Pool.QueryRow(ctx, `SELECT currency FROM commerce.orders WHERE id = $1`, parentOrder.ID).Scan(&dbOrderCurrency)
	if err != nil || dbOrderCurrency != targetCurrency {
		t.Fatalf("expected commerce.orders currency %s, got %s (err: %v)", targetCurrency, dbOrderCurrency, err)
	}

	// Verify payment record has 'SAR'
	var dbPaymentCurrency string
	err = db.Pool.QueryRow(ctx, `SELECT currency FROM commerce.payments WHERE order_id = $1`, parentOrder.ID).Scan(&dbPaymentCurrency)
	if err != nil || dbPaymentCurrency != targetCurrency {
		t.Fatalf("expected commerce.payments currency %s, got %s (err: %v)", targetCurrency, dbPaymentCurrency, err)
	}

	// Verify journal entry record has 'SAR'
	var dbJECurrency string
	err = db.Pool.QueryRow(ctx, `SELECT currency FROM ledger.journal_entries WHERE reference_id = $1 AND reference_type = 'order'`, parentOrder.ID).Scan(&dbJECurrency)
	if err != nil || dbJECurrency != targetCurrency {
		t.Fatalf("expected ledger.journal_entries currency %s, got %s (err: %v)", targetCurrency, dbJECurrency, err)
	}
}

