-- Migration 000012 Rollback: Revert Ledger Integrity Changes
DROP INDEX IF EXISTS ledger.idx_ledger_lines_entry_balance;
DROP INDEX IF EXISTS ledger.idx_journal_entries_prev_hash;
DROP INDEX IF EXISTS ledger.idx_journal_entries_hash;
DROP INDEX IF EXISTS ledger.idx_journal_entries_seq;

ALTER TABLE ledger.journal_entries
DROP COLUMN IF EXISTS hash,
DROP COLUMN IF EXISTS prev_hash,
DROP COLUMN IF EXISTS sequence_id;

-- Restore original non-memoized balance trigger
CREATE OR REPLACE FUNCTION ledger.fn_check_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_net_balance BIGINT;
    v_entry_status TEXT;
BEGIN
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
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
