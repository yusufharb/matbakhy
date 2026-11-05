package wallet

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/jackc/pgx/v5"
)

const GenesisPrevHash = "0000000000000000000000000000000000000000000000000000000000000000"

type ChainVerificationReport struct {
	Valid                bool   `json:"valid"`
	EntriesVerified      int    `json:"entries_verified"`
	TamperedEntryID      string `json:"tampered_entry_id,omitempty"`
	TamperedEntryNumber  string `json:"tampered_entry_number,omitempty"`
	Reason               string `json:"reason,omitempty"`
}

// ComputeJournalEntryHash computes a deterministic SHA-256 hash across immutable entry attributes.
func ComputeJournalEntryHash(prevHash, entryNumber, refType, refID, action, currency, status, idempotencyKey string) string {
	raw := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%s|%s",
		prevHash, entryNumber, refType, refID, action, currency, status, idempotencyKey,
	)
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// GetLatestJournalEntryHash returns the hash of the most recent journal entry or the GenesisPrevHash.
func (r *Repository) GetLatestJournalEntryHash(ctx context.Context, tx pgx.Tx) (string, error) {
	query := `
		SELECT hash FROM ledger.journal_entries
		WHERE hash IS NOT NULL
		ORDER BY sequence_id DESC
		LIMIT 1
	`
	var latestHash string
	var err error
	if tx != nil {
		_, _ = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(742910)")
		err = tx.QueryRow(ctx, query).Scan(&latestHash)
	} else {
		err = r.pool.QueryRow(ctx, query).Scan(&latestHash)
	}

	if err != nil {
		if err == pgx.ErrNoRows {
			return GenesisPrevHash, nil
		}
		return GenesisPrevHash, err
	}

	if latestHash == "" {
		return GenesisPrevHash, nil
	}
	return latestHash, nil
}

// VerifyLedgerChain traverses all journal entries chronologically and verifies cryptographic integrity.
func (r *Repository) VerifyLedgerChain(ctx context.Context) (*ChainVerificationReport, error) {
	query := `
		SELECT id, entry_number, reference_type, reference_id, action, currency, status, idempotency_key, prev_hash, hash
		FROM ledger.journal_entries
		ORDER BY sequence_id ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query journal entries: %w", err)
	}
	defer rows.Close()

	expectedPrevHash := GenesisPrevHash
	count := 0

	for rows.Next() {
		var id, entryNum, refType, refID, action, currency, status, idemKey string
		var prevHash, hash *string

		if err := rows.Scan(&id, &entryNum, &refType, &refID, &action, &currency, &status, &idemKey, &prevHash, &hash); err != nil {
			return nil, fmt.Errorf("scan error at entry %d: %w", count+1, err)
		}

		currPrevHash := ""
		if prevHash != nil {
			currPrevHash = *prevHash
		}
		currHash := ""
		if hash != nil {
			currHash = *hash
		}

		// 1. Verify link to previous entry
		if count > 0 && currPrevHash != expectedPrevHash {
			return &ChainVerificationReport{
				Valid:               false,
				EntriesVerified:     count,
				TamperedEntryID:     id,
				TamperedEntryNumber: entryNum,
				Reason:              fmt.Sprintf("broken link: prev_hash %s does not match expected previous hash %s", currPrevHash, expectedPrevHash),
			}, nil
		}

		// 2. Recompute hash
		computedHash := ComputeJournalEntryHash(currPrevHash, entryNum, refType, refID, action, currency, status, idemKey)
		if currHash != computedHash {
			return &ChainVerificationReport{
				Valid:               false,
				EntriesVerified:     count,
				TamperedEntryID:     id,
				TamperedEntryNumber: entryNum,
				Reason:              fmt.Sprintf("tampered data: stored hash %s does not match computed hash %s", currHash, computedHash),
			}, nil
		}

		expectedPrevHash = currHash
		count++
	}

	return &ChainVerificationReport{
		Valid:           true,
		EntriesVerified: count,
	}, nil
}
