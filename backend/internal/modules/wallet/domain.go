package wallet

import (
	"errors"
	"time"
)

var (
	ErrUnbalancedJournalEntry = errors.New("ledger error: sum of debits must equal sum of credits")
	ErrNegativeAmount         = errors.New("ledger error: amount must be strictly greater than zero")
	ErrInvalidEntryType       = errors.New("ledger error: entry type must be 'debit' or 'credit'")
)

// Account represents a financial bucket in the Chart of Accounts.
type Account struct {
	ID          string `json:"id"`
	OwnerType   string `json:"owner_type"` // platform, supplier, merchant
	OwnerID     string `json:"owner_id"`
	Currency    string `json:"currency"`
	AccountCode string `json:"account_code"` // e.g. 1010, 2020, 2030, 4010
	Name        string `json:"name"`
	IsActive    bool   `json:"is_active"`
}

// JournalEntry represents a balanced immutable financial movement.
type JournalEntry struct {
	ID             string       `json:"id"`
	EntryNumber    string       `json:"entry_number"` // e.g. JE-884291
	ReferenceType  string       `json:"reference_type"` // order, refund, payout
	ReferenceID    string       `json:"reference_id"`
	Action         string       `json:"action"`
	Description    string       `json:"description"`
	Currency       string       `json:"currency"`
	Status         string       `json:"status"` // posted, reversed
	IdempotencyKey string       `json:"idempotency_key"`
	PrevHash       string       `json:"prev_hash,omitempty"`
	Hash           string       `json:"hash,omitempty"`
	Lines          []LedgerLine `json:"lines"`
	PostedAt       time.Time    `json:"posted_at"`
}

// LedgerLine represents a single debit or credit leg.
type LedgerLine struct {
	ID        string `json:"id"`
	AccountID string `json:"account_id"`
	EntryType string `json:"entry_type"` // debit or credit
	Amount    int64  `json:"amount"`     // Minor units (positive integer)
}

// ValidateBalanced enforces the fundamental double-entry invariant: Sum(Debits) == Sum(Credits).
func (e *JournalEntry) ValidateBalanced() error {
	if len(e.Lines) < 2 {
		return errors.New("ledger error: journal entry must have at least 2 lines")
	}

	var totalDebits int64
	var totalCredits int64

	for _, line := range e.Lines {
		if line.Amount <= 0 {
			return ErrNegativeAmount
		}
		switch line.EntryType {
		case "debit":
			totalDebits += line.Amount
		case "credit":
			totalCredits += line.Amount
		default:
			return ErrInvalidEntryType
		}
	}

	if totalDebits != totalCredits {
		return ErrUnbalancedJournalEntry
	}

	return nil
}
