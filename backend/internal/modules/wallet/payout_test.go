package wallet_test

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/wallet"
)

func TestPayoutOverdrawPreventionAndAtomicHold(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping live database test: %v", err)
	}
	defer db.Close()

	repo := wallet.NewRepository(db.Pool)

	// Use test supplier Noura Foods
	supplierID := "b0000000-0000-0000-0000-000000000002"

	// 1. Ensure supplier has Account 2030 (Available Payable)
	var sup2030ID string
	err = db.Pool.QueryRow(ctx, `
		SELECT id FROM ledger.accounts
		WHERE owner_id = $1 AND account_code = '2030'
		LIMIT 1
	`, supplierID).Scan(&sup2030ID)

	if err != nil {
		err = db.Pool.QueryRow(ctx, `
			INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
			VALUES (gen_random_uuid(), 'supplier', $1, 'USD', '2030', 'Noura Foods Available Payable')
			RETURNING id
		`, supplierID).Scan(&sup2030ID)
		if err != nil {
			t.Fatalf("failed to create supplier account 2030: %v", err)
		}
	}

	// Calculate current available balance on Account 2030: SUM(credit - debit)
	var currentAvail int64
	_ = db.Pool.QueryRow(ctx, `
		SELECT coalesce(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
		FROM ledger.lines WHERE account_id = $1
	`, sup2030ID).Scan(&currentAvail)

	// Case A: Overdraw attempt! Request amount greater than current available balance
	overdrawAmount := currentAvail + 1000000 // $10,000 more than available
	_, err = repo.CreatePayoutRequest(ctx, supplierID, overdrawAmount, "USD", "National Bank", "IBAN123456789")
	if err == nil {
		t.Fatalf("CRITICAL FINANCIAL BUG: payout request succeeded with insufficient available balance (available: %d, requested: %d)",
			currentAvail, overdrawAmount)
	}
	if !strings.Contains(err.Error(), "insufficient") {
		t.Fatalf("expected error to mention 'insufficient', got: %v", err)
	}

	// Case B: Fund Account 2030 with $500.00 (50,000 cents) and request $200.00 (20,000 cents)
	var bank1020ID string
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '1020' LIMIT 1`).Scan(&bank1020ID)
	_, err = repo.PostJournalEntry(ctx, wallet.JournalEntry{
		ReferenceType:  "settlement",
		ReferenceID:    supplierID,
		Action:         "escrow_cleared",
		Description:    "Test Escrow Release",
		Currency:       "USD",
		Status:         "posted",
		IdempotencyKey: fmt.Sprintf("idem-fund-%d", time.Now().UnixNano()),
		Lines: []wallet.LedgerLine{
			{AccountID: bank1020ID, EntryType: "debit", Amount: 50000},
			{AccountID: sup2030ID, EntryType: "credit", Amount: 50000},
		},
	})
	if err != nil {
		t.Fatalf("failed to post fund journal entry: %v", err)
	}

	// Recompute available balance after funding
	var fundedBalance int64
	_ = db.Pool.QueryRow(ctx, `
		SELECT coalesce(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
		FROM ledger.lines WHERE account_id = $1
	`, sup2030ID).Scan(&fundedBalance)

	payoutAmount := int64(20000) // $200.00
	pr, err := repo.CreatePayoutRequest(ctx, supplierID, payoutAmount, "USD", "National Bank", "IBAN123456789")
	if err != nil {
		t.Fatalf("legitimate payout request failed: %v", err)
	}

	if pr.AmountCents != payoutAmount {
		t.Fatalf("expected payout amount %d, got %d", payoutAmount, pr.AmountCents)
	}

	// Check that balance on Account 2030 decreased by exactly payoutAmount
	var postPayoutAvail int64
	_ = db.Pool.QueryRow(ctx, `
		SELECT coalesce(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
		FROM ledger.lines WHERE account_id = $1
	`, sup2030ID).Scan(&postPayoutAvail)

	expectedPostAvail := fundedBalance - payoutAmount
	if postPayoutAvail != expectedPostAvail {
		t.Fatalf("atomic hold invariant violated: before=%d, payout=%d, expected after=%d, actual after=%d",
			fundedBalance, payoutAmount, expectedPostAvail, postPayoutAvail)
	}

	// Check that Account 2040 (hold) exists and has hold credited
	var sup2040ID string
	err = db.Pool.QueryRow(ctx, `
		SELECT id FROM ledger.accounts
		WHERE owner_id = $1 AND account_code = '2040'
		LIMIT 1
	`, supplierID).Scan(&sup2040ID)
	if err != nil {
		t.Fatalf("expected Account 2040 (payout hold) to exist: %v", err)
	}

	var holdBalance int64
	_ = db.Pool.QueryRow(ctx, `
		SELECT coalesce(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
		FROM ledger.lines WHERE account_id = $1
	`, sup2040ID).Scan(&holdBalance)

	if holdBalance < payoutAmount {
		t.Fatalf("expected Account 2040 hold balance to be at least %d, got %d", payoutAmount, holdBalance)
	}
}
