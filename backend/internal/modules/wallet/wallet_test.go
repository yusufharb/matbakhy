package wallet_test

import (
	"context"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/wallet"
)

func TestJournalEntryValidation(t *testing.T) {
	// 1. Balanced entry should pass
	balanced := wallet.JournalEntry{
		ID:          "test-je-1",
		EntryNumber: "JE-TEST-01",
		Lines: []wallet.LedgerLine{
			{AccountID: "acc-1", EntryType: "debit", Amount: 5000},
			{AccountID: "acc-2", EntryType: "credit", Amount: 3500},
			{AccountID: "acc-3", EntryType: "credit", Amount: 1500},
		},
	}
	if err := balanced.ValidateBalanced(); err != nil {
		t.Fatalf("expected balanced entry to pass, got error: %v", err)
	}

	// 2. Unbalanced entry should fail
	unbalanced := wallet.JournalEntry{
		ID:          "test-je-2",
		EntryNumber: "JE-TEST-02",
		Lines: []wallet.LedgerLine{
			{AccountID: "acc-1", EntryType: "debit", Amount: 5000},
			{AccountID: "acc-2", EntryType: "credit", Amount: 4000}, // missing 1000
		},
	}
	if err := unbalanced.ValidateBalanced(); err != wallet.ErrUnbalancedJournalEntry {
		t.Fatalf("expected ErrUnbalancedJournalEntry, got: %v", err)
	}

	// 3. Negative amount should fail
	negative := wallet.JournalEntry{
		ID:          "test-je-3",
		EntryNumber: "JE-TEST-03",
		Lines: []wallet.LedgerLine{
			{AccountID: "acc-1", EntryType: "debit", Amount: -500},
			{AccountID: "acc-2", EntryType: "credit", Amount: -500},
		},
	}
	if err := negative.ValidateBalanced(); err != wallet.ErrNegativeAmount {
		t.Fatalf("expected ErrNegativeAmount, got: %v", err)
	}
}

func TestDatabaseLedgerTriggerEnforcement(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping live database test: %v", err)
	}
	defer db.Close()

	repo := wallet.NewRepository(db.Pool)

	// Fetch valid accounts from database
	accounts, err := repo.ListAccounts(ctx, "")
	if err != nil || len(accounts) < 2 {
		t.Skipf("skipping trigger test, need at least 2 accounts: %v", err)
	}

	// Valid entry
	validEntry := wallet.JournalEntry{
		ReferenceType:  "order",
		ReferenceID:    "e0000000-0000-0000-0000-000000000001",
		Action:         "test_settlement",
		Description:    "Automated integration test entry",
		Currency:       "USD",
		IdempotencyKey: "test-idem-" + time.Now().Format("20060102150405.000000"),
		Lines: []wallet.LedgerLine{
			{AccountID: accounts[0].ID, EntryType: "debit", Amount: 1000},
			{AccountID: accounts[1].ID, EntryType: "credit", Amount: 1000},
		},
	}

	saved, err := repo.PostJournalEntry(ctx, validEntry)
	if err != nil {
		t.Fatalf("expected valid entry to be posted successfully: %v", err)
	}
	if saved.ID == "" {
		t.Fatalf("expected saved entry to have ID")
	}
}
