package wallet_test

import (
	"context"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/wallet"
)

func TestTopUpMerchantWalletAccount2010(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	repo := wallet.NewRepository(db.Pool)
	merchantOrgID := "b0000000-0000-0000-0000-000000000004"

	// Fetch initial balance
	initBal, err := repo.GetWalletBalance(ctx, "merchant", merchantOrgID)
	if err != nil {
		t.Fatalf("failed to get merchant wallet balance: %v", err)
	}

	topupAmount := int64(50000) // 500.00 USD
	idemKey := "topup-merch-" + time.Now().Format("20060102150405.000000")

	// Execute top-up
	je, err := repo.TopUpWallet(ctx, "merchant", merchantOrgID, topupAmount, "USD", idemKey)
	if err != nil {
		t.Fatalf("failed to top up merchant wallet: %v", err)
	}

	if je.ID == "" || je.Status != "posted" {
		t.Fatalf("unexpected journal entry status: %+v", je)
	}

	// Verify ledger lines: 1 debit to 1010, 1 credit to 2010
	if len(je.Lines) != 2 {
		t.Fatalf("expected 2 lines in topup journal entry, got %d", len(je.Lines))
	}

	var hasClearingDebit, hasMerchantCredit bool
	for _, l := range je.Lines {
		var code string
		_ = db.Pool.QueryRow(ctx, `SELECT account_code FROM ledger.accounts WHERE id = $1`, l.AccountID).Scan(&code)
		if code == "1010" && l.EntryType == "debit" && l.Amount == topupAmount {
			hasClearingDebit = true
		}
		if code == "2010" && l.EntryType == "credit" && l.Amount == topupAmount {
			hasMerchantCredit = true
		}
	}

	if !hasClearingDebit {
		t.Fatalf("missing or incorrect debit line to clearing account 1010")
	}
	if !hasMerchantCredit {
		t.Fatalf("missing or incorrect credit line to merchant wallet account 2010")
	}

	// Verify balance increase
	newBal, err := repo.GetWalletBalance(ctx, "merchant", merchantOrgID)
	if err != nil {
		t.Fatalf("failed to get updated merchant wallet balance: %v", err)
	}
	if newBal.Balance != initBal.Balance+topupAmount {
		t.Fatalf("expected merchant balance %d, got %d", initBal.Balance+topupAmount, newBal.Balance)
	}

	// Test idempotency: second call with same idemKey must return existing entry without changing balance
	je2, err := repo.TopUpWallet(ctx, "merchant", merchantOrgID, topupAmount, "USD", idemKey)
	if err != nil {
		t.Fatalf("failed to process idempotent top-up: %v", err)
	}
	if je2.ID != je.ID {
		t.Fatalf("expected same journal entry ID for idempotent request, got %s vs %s", je2.ID, je.ID)
	}

	balAfterDupe, _ := repo.GetWalletBalance(ctx, "merchant", merchantOrgID)
	if balAfterDupe.Balance != newBal.Balance {
		t.Fatalf("idempotent replay incorrectly increased balance from %d to %d", newBal.Balance, balAfterDupe.Balance)
	}
}

func TestTopUpCustomerWalletAccount2050(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	repo := wallet.NewRepository(db.Pool)
	customerUserID := "a0000000-0000-0000-0000-000000000004"

	// Fetch initial balance
	initBal, err := repo.GetWalletBalance(ctx, "customer", customerUserID)
	if err != nil {
		t.Fatalf("failed to get customer wallet balance: %v", err)
	}

	topupAmount := int64(25000) // 250.00 USD
	idemKey := "topup-cust-" + time.Now().Format("20060102150405.000000")

	// Execute top-up
	je, err := repo.TopUpWallet(ctx, "customer", customerUserID, topupAmount, "USD", idemKey)
	if err != nil {
		t.Fatalf("failed to top up customer wallet: %v", err)
	}

	if je.ID == "" || je.Status != "posted" {
		t.Fatalf("unexpected journal entry status: %+v", je)
	}

	// Verify ledger lines: 1 debit to 1010, 1 credit to 2050
	if len(je.Lines) != 2 {
		t.Fatalf("expected 2 lines in topup journal entry, got %d", len(je.Lines))
	}

	var hasClearingDebit, hasCustomerCredit bool
	for _, l := range je.Lines {
		var code string
		_ = db.Pool.QueryRow(ctx, `SELECT account_code FROM ledger.accounts WHERE id = $1`, l.AccountID).Scan(&code)
		if code == "1010" && l.EntryType == "debit" && l.Amount == topupAmount {
			hasClearingDebit = true
		}
		if code == "2050" && l.EntryType == "credit" && l.Amount == topupAmount {
			hasCustomerCredit = true
		}
	}

	if !hasClearingDebit {
		t.Fatalf("missing or incorrect debit line to clearing account 1010")
	}
	if !hasCustomerCredit {
		t.Fatalf("missing or incorrect credit line to customer wallet account 2050")
	}

	// Verify balance increase
	newBal, err := repo.GetWalletBalance(ctx, "customer", customerUserID)
	if err != nil {
		t.Fatalf("failed to get updated customer wallet balance: %v", err)
	}
	if newBal.Balance != initBal.Balance+topupAmount {
		t.Fatalf("expected customer balance %d, got %d", initBal.Balance+topupAmount, newBal.Balance)
	}
}
