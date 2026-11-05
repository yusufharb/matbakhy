package wallet_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/marketplace/core/internal/database"
	"github.com/marketplace/core/internal/modules/wallet"
)

// TestPayoutLifecycleAccountingBalances rigorously asserts the complete 3-step accounting lifecycle:
// Step 1: Payout Request (Hold):
//   - Journal Entry: DR 2030 (Supplier Available), CR 2040 (Supplier Hold)
//   - Account 2030 decreases by payout amount, Account 2040 increases by payout amount
//   - Account 1020 is NOT present in this entry
// Step 2: Payout Approval & Disbursement (Payment):
//   - Journal Entry: DR 2040 (Supplier Hold), CR 1020 (Operating Bank Cash)
//   - Account 2040 decreases by payout amount (hold cleared)
//   - Payout status becomes 'approved'
// Step 3: Payout Rejection (Hold Release):
//   - Journal Entry: DR 2040 (Supplier Hold), CR 2030 (Supplier Available)
//   - Account 2040 decreases by payout amount (hold cleared)
//   - Account 2030 increases by payout amount (available restored)
//   - Payout status becomes 'rejected'
func TestPayoutLifecycleAccountingBalances(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx)
	if err != nil {
		t.Skipf("skipping database test: %v", err)
	}
	defer db.Close()

	repo := wallet.NewRepository(db.Pool)
	supplierID := "b0000000-0000-0000-0000-000000000002"
	adminID := "a0000000-0000-0000-0000-000000000001"

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

	type lineInfo struct {
		accountCode string
		accountID   string
		entryType   string
		amount      int64
	}
	getJELines := func(referenceID, action string) []lineInfo {
		rows, err := db.Pool.Query(ctx, `
			SELECT a.account_code, a.id, l.entry_type, l.amount
			FROM ledger.lines l
			JOIN ledger.accounts a ON a.id = l.account_id
			JOIN ledger.journal_entries je ON je.id = l.journal_entry_id
			WHERE je.reference_id = $1 AND je.action = $2
			ORDER BY l.entry_type DESC
		`, referenceID, action)
		if err != nil {
			t.Fatalf("failed to query JE lines for ref=%s action=%s: %v", referenceID, action, err)
		}
		defer rows.Close()

		var res []lineInfo
		for rows.Next() {
			var li lineInfo
			_ = rows.Scan(&li.accountCode, &li.accountID, &li.entryType, &li.amount)
			res = append(res, li)
		}
		return res
	}

	// 1. Ensure supplier has Account 2030 with funds
	var sup2030ID, bank1020ID string
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE owner_id = $1 AND account_code = '2030' LIMIT 1`, supplierID).Scan(&sup2030ID)
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE account_code = '1020' LIMIT 1`).Scan(&bank1020ID)

	// Fund supplier available balance with $1,000.00
	_, err = repo.PostJournalEntry(ctx, wallet.JournalEntry{
		ReferenceType:  "settlement",
		ReferenceID:    supplierID,
		Action:         "escrow_cleared",
		Description:    "Pre-test Settlement Fund",
		Currency:       "USD",
		Status:         "posted",
		IdempotencyKey: fmt.Sprintf("idem-fund-lifecycle-%d", time.Now().UnixNano()),
		Lines: []wallet.LedgerLine{
			{AccountID: bank1020ID, EntryType: "debit", Amount: 100000},
			{AccountID: sup2030ID, EntryType: "credit", Amount: 100000},
		},
	})
	if err != nil {
		t.Fatalf("failed to fund supplier available account: %v", err)
	}

	// =========================================================================
	// SCENARIO 1 & 2: Payout Request (Hold) -> Payout Approval (Disbursement)
	// =========================================================================
	init2030Bal := getBalance(sup2030ID, false)

	payout1Amount := int64(30000) // $300.00
	pr1, err := repo.CreatePayoutRequest(ctx, supplierID, payout1Amount, "USD", "First National Bank", "IBAN987654321")
	if err != nil {
		t.Fatalf("payout request 1 failed: %v", err)
	}

	var sup2040ID string
	_ = db.Pool.QueryRow(ctx, `SELECT id FROM ledger.accounts WHERE owner_id = $1 AND account_code = '2040' LIMIT 1`, supplierID).Scan(&sup2040ID)
	if sup2040ID == "" {
		t.Fatalf("expected Account 2040 to exist after payout request")
	}

	// Assert Step 1: Available (2030) decreased by $300, Hold (2040) increased by $300
	postHold2030Bal := getBalance(sup2030ID, false)
	postHold2040Bal := getBalance(sup2040ID, false)

	if postHold2030Bal != (init2030Bal - payout1Amount) {
		t.Fatalf("Step 1 Available balance mismatch: expected %d, got %d", init2030Bal-payout1Amount, postHold2030Bal)
	}
	if postHold2040Bal < payout1Amount {
		t.Fatalf("Step 1 Hold balance mismatch: expected at least %d, got %d", payout1Amount, postHold2040Bal)
	}

	// Assert Step 1 Journal Entry Lines: DR 2030, CR 2040
	holdLines := getJELines(pr1.ID, "payout_hold")
	if len(holdLines) != 2 {
		t.Fatalf("expected 2 lines in payout_hold JE, got %d: %+v", len(holdLines), holdLines)
	}
	if holdLines[0].accountCode != "2030" || holdLines[0].entryType != "debit" || holdLines[0].amount != payout1Amount {
		t.Fatalf("expected hold DR line 2030 of %d, got %+v", payout1Amount, holdLines[0])
	}
	if holdLines[1].accountCode != "2040" || holdLines[1].entryType != "credit" || holdLines[1].amount != payout1Amount {
		t.Fatalf("expected hold CR line 2040 of %d, got %+v", payout1Amount, holdLines[1])
	}

	// Step 2: Approve Payout 1 (Disbursement)
	approvedPR, err := repo.ApprovePayout(ctx, pr1.ID, adminID)
	if err != nil {
		t.Fatalf("ApprovePayout failed: %v", err)
	}
	if approvedPR.Status != "approved" {
		t.Fatalf("expected status 'approved', got %s", approvedPR.Status)
	}

	// Assert Step 2 Journal Entry Lines: DR 2040 (Supplier Hold), CR 1020 (Operating Bank Cash)
	disbLines := getJELines(pr1.ID, "payout_cleared")
	if len(disbLines) != 2 {
		t.Fatalf("expected 2 lines in payout_cleared JE, got %d: %+v", len(disbLines), disbLines)
	}
	if disbLines[0].accountCode != "2040" || disbLines[0].entryType != "debit" || disbLines[0].amount != payout1Amount {
		t.Fatalf("expected disbursement DR line 2040 of %d, got %+v", payout1Amount, disbLines[0])
	}
	if disbLines[1].accountCode != "1020" || disbLines[1].entryType != "credit" || disbLines[1].amount != payout1Amount {
		t.Fatalf("expected disbursement CR line 1020 of %d, got %+v", payout1Amount, disbLines[1])
	}

	// Assert Step 2: Hold (2040) decreased by $300, Available (2030) unchanged
	postApprove2030Bal := getBalance(sup2030ID, false)
	postApprove2040Bal := getBalance(sup2040ID, false)

	if postApprove2040Bal != (postHold2040Bal - payout1Amount) {
		t.Fatalf("Step 2 Hold balance did not clear: before=%d, after=%d, delta=%d",
			postHold2040Bal, postApprove2040Bal, postHold2040Bal-postApprove2040Bal)
	}
	if postApprove2030Bal != postHold2030Bal {
		t.Fatalf("Step 2 Available balance should not change on approval: before=%d, after=%d",
			postHold2030Bal, postApprove2030Bal)
	}

	// =========================================================================
	// SCENARIO 3: Payout Request (Hold) -> Payout Rejection (Hold Release)
	// =========================================================================
	payout2Amount := int64(15000) // $150.00
	pr2, err := repo.CreatePayoutRequest(ctx, supplierID, payout2Amount, "USD", "First National Bank", "IBAN_INVALID")
	if err != nil {
		t.Fatalf("payout request 2 failed: %v", err)
	}

	preReject2030Bal := getBalance(sup2030ID, false)
	preReject2040Bal := getBalance(sup2040ID, false)

	// Step 3: Reject Payout 2
	rejectedPR, err := repo.RejectPayout(ctx, pr2.ID, adminID, "Invalid IBAN supplied")
	if err != nil {
		t.Fatalf("RejectPayout failed: %v", err)
	}
	if rejectedPR.Status != "rejected" {
		t.Fatalf("expected status 'rejected', got %s", rejectedPR.Status)
	}

	// Assert Step 3 Journal Entry Lines: DR 2040 (Supplier Hold), CR 2030 (Supplier Available)
	rejLines := getJELines(pr2.ID, "payout_rejected")
	if len(rejLines) != 2 {
		t.Fatalf("expected 2 lines in payout_rejected JE, got %d: %+v", len(rejLines), rejLines)
	}
	if rejLines[0].accountCode != "2040" || rejLines[0].entryType != "debit" || rejLines[0].amount != payout2Amount {
		t.Fatalf("expected rejection DR line 2040 of %d, got %+v", payout2Amount, rejLines[0])
	}
	if rejLines[1].accountCode != "2030" || rejLines[1].entryType != "credit" || rejLines[1].amount != payout2Amount {
		t.Fatalf("expected rejection CR line 2030 of %d, got %+v", payout2Amount, rejLines[1])
	}

	// Assert Step 3: Hold (2040) decreased by $150, Available (2030) restored (+ $150)
	postReject2030Bal := getBalance(sup2030ID, false)
	postReject2040Bal := getBalance(sup2040ID, false)

	if postReject2040Bal != (preReject2040Bal - payout2Amount) {
		t.Fatalf("Step 3 Hold balance did not clear: before=%d, after=%d", preReject2040Bal, postReject2040Bal)
	}
	if postReject2030Bal != (preReject2030Bal + payout2Amount) {
		t.Fatalf("Step 3 Available balance was not restored: before=%d, after=%d, expected=%d",
			preReject2030Bal, postReject2030Bal, preReject2030Bal+payout2Amount)
	}
}
