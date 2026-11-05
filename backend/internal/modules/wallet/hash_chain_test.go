package wallet_test

import (
	"context"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/wallet"
)

func TestComputeJournalEntryHashDeterminism(t *testing.T) {
	prevHash := wallet.GenesisPrevHash
	entryNum := "JE-1001"
	refType := "order"
	refID := "ord-123"
	action := "order_settlement"
	currency := "USD"
	status := "posted"
	idemKey := "idem-1001"

	h1 := wallet.ComputeJournalEntryHash(prevHash, entryNum, refType, refID, action, currency, status, idemKey)
	if len(h1) != 64 {
		t.Fatalf("expected 64 hex characters, got %d", len(h1))
	}

	// Deterministic
	h2 := wallet.ComputeJournalEntryHash(prevHash, entryNum, refType, refID, action, currency, status, idemKey)
	if h1 != h2 {
		t.Fatalf("hash computation is not deterministic: %s != %s", h1, h2)
	}

	// Any difference causes avalanche effect
	h3 := wallet.ComputeJournalEntryHash(prevHash, entryNum, refType, refID, "order_refund", currency, status, idemKey)
	if h1 == h3 {
		t.Fatalf("hash failed to change when action changed: %s == %s", h1, h3)
	}

	h4 := wallet.ComputeJournalEntryHash("1111111111111111111111111111111111111111111111111111111111111111", entryNum, refType, refID, action, currency, status, idemKey)
	if h1 == h4 {
		t.Fatalf("hash failed to change when prevHash changed: %s == %s", h1, h4)
	}
}

func TestLedgerCryptographicChainVerification(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping live database test: %v", err)
	}
	defer db.Close()

	repo := wallet.NewRepository(db.Pool)

	report, err := repo.VerifyLedgerChain(ctx)
	if err != nil {
		t.Fatalf("VerifyLedgerChain returned unexpected error: %v", err)
	}

	if !report.Valid {
		t.Fatalf("Ledger chain verification failed: tampered entry %s (%s), reason: %s",
			report.TamperedEntryID, report.TamperedEntryNumber, report.Reason)
	}

	if report.EntriesVerified == 0 {
		t.Fatalf("Expected at least one verified journal entry, got 0")
	}

	t.Logf("Successfully verified %d journal entries in cryptographic hash chain", report.EntriesVerified)
}

func TestLedgerTamperDetection(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping live database test: %v", err)
	}
	defer db.Close()

	repo := wallet.NewRepository(db.Pool)

	// 1. Pick the latest journal entry to tamper with
	var targetID, originalAction string
	err = db.Pool.QueryRow(ctx, `
		SELECT id, action
		FROM ledger.journal_entries
		ORDER BY created_at DESC, entry_number DESC
		LIMIT 1
	`).Scan(&targetID, &originalAction)
	if err != nil {
		t.Fatalf("failed to query a journal entry for tamper test: %v", err)
	}

	// 2. Tamper with the action column directly in SQL without updating the cryptographic hash
	_, err = db.Pool.Exec(ctx, `UPDATE ledger.journal_entries SET action = 'tampered_action_test' WHERE id = $1`, targetID)
	if err != nil {
		t.Fatalf("failed to inject tamper into journal entry: %v", err)
	}

	// Always restore the original action on exit
	defer func() {
		_, _ = db.Pool.Exec(ctx, `UPDATE ledger.journal_entries SET action = $1 WHERE id = $2`, originalAction, targetID)
	}()

	// 3. Verify ledger detects the tampering
	report, err := repo.VerifyLedgerChain(ctx)
	if err != nil {
		t.Fatalf("VerifyLedgerChain failed during tamper check: %v", err)
	}

	if report.Valid {
		t.Fatalf("CRITICAL INTEGRITY BREACH: ledger chain verification passed despite tampered entry %s!", targetID)
	}

	if report.TamperedEntryID != targetID {
		t.Fatalf("expected tampered entry ID %s, but got %s", targetID, report.TamperedEntryID)
	}

	t.Logf("Tamper successfully detected: entry=%s, reason=%s", report.TamperedEntryID, report.Reason)

	// 4. Restore original action and verify chain becomes valid again
	_, err = db.Pool.Exec(ctx, `UPDATE ledger.journal_entries SET action = $1 WHERE id = $2`, originalAction, targetID)
	if err != nil {
		t.Fatalf("failed to restore original action: %v", err)
	}

	restoredReport, err := repo.VerifyLedgerChain(ctx)
	if err != nil {
		t.Fatalf("VerifyLedgerChain failed after restoring entry: %v", err)
	}
	if !restoredReport.Valid {
		t.Fatalf("Ledger chain remained invalid after restoring entry: %s", restoredReport.Reason)
	}
	t.Logf("Chain integrity confirmed after tamper restoration")
}
