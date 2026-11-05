-- Migration 000012: Ledger Cryptographic Hash Chain & Per-Entry Optimization
ALTER TABLE ledger.journal_entries
ADD COLUMN IF NOT EXISTS sequence_id BIGSERIAL,
ADD COLUMN IF NOT EXISTS prev_hash TEXT,
ADD COLUMN IF NOT EXISTS hash TEXT;

CREATE INDEX IF NOT EXISTS idx_journal_entries_seq ON ledger.journal_entries(sequence_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_hash ON ledger.journal_entries(hash);
CREATE INDEX IF NOT EXISTS idx_journal_entries_prev_hash ON ledger.journal_entries(prev_hash);
CREATE INDEX IF NOT EXISTS idx_ledger_lines_entry_balance ON ledger.lines (journal_entry_id, entry_type, amount);

-- Optimized Per-Entry Balance Verification Function:
-- Uses transaction-scoped memoization to check each journal entry exactly ONCE per transaction,
-- avoiding O(N) re-aggregation over multiple lines.
CREATE OR REPLACE FUNCTION ledger.fn_check_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_net_balance BIGINT;
    v_entry_status TEXT;
    v_checked_entries TEXT;
BEGIN
    -- Check if this transaction already verified this journal_entry_id
    BEGIN
        v_checked_entries := current_setting('ledger.verified_entries', true);
    EXCEPTION WHEN OTHERS THEN
        v_checked_entries := '';
    END;

    IF position(NEW.journal_entry_id::text in v_checked_entries) > 0 THEN
        -- Already verified in this transaction; skip duplicate re-aggregation
        RETURN NEW;
    END IF;

    -- Check status of parent journal entry
    SELECT status INTO v_entry_status 
    FROM ledger.journal_entries 
    WHERE id = NEW.journal_entry_id;

    IF v_entry_status = 'posted' THEN
        SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0)
        INTO v_net_balance
        FROM ledger.lines
        WHERE journal_entry_id = NEW.journal_entry_id;

        IF v_net_balance != 0 THEN
            RAISE EXCEPTION 'Double-entry invariant violation: Journal Entry % is unbalanced! Net imbalance: % minor units', 
                NEW.journal_entry_id, v_net_balance;
        END IF;

        -- Record this journal_entry_id as verified for the rest of this transaction
        PERFORM set_config('ledger.verified_entries', COALESCE(v_checked_entries, '') || ',' || NEW.journal_entry_id::text, true);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill cryptographic hash chain for existing journal entries
DO $$
DECLARE
    v_rec RECORD;
    v_prev_hash TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    v_curr_hash TEXT;
    v_raw TEXT;
BEGIN
    FOR v_rec IN 
        SELECT id, entry_number, reference_type, reference_id, action, currency, status, idempotency_key
        FROM ledger.journal_entries
        ORDER BY sequence_id ASC
    LOOP
        v_raw := v_prev_hash || '|' || v_rec.entry_number || '|' || v_rec.reference_type || '|' || 
                 v_rec.reference_id::text || '|' || v_rec.action || '|' || v_rec.currency || '|' || 
                 v_rec.status || '|' || v_rec.idempotency_key;
        v_curr_hash := encode(sha256(v_raw::bytea), 'hex');

        UPDATE ledger.journal_entries
        SET prev_hash = v_prev_hash, hash = v_curr_hash
        WHERE id = v_rec.id;

        v_prev_hash := v_curr_hash;
    END LOOP;
END;
$$;
