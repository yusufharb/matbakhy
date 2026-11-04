-- Migration 000009: Double-Entry Ledger Mathematical Invariant Enforcement
-- Enforces: SUM(Debits) == SUM(Credits) per journal_entry_id at COMMIT time

CREATE OR REPLACE FUNCTION ledger.fn_check_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_net_balance BIGINT;
    v_entry_status TEXT;
BEGIN
    -- Check the status of the parent journal entry
    SELECT status INTO v_entry_status 
    FROM ledger.journal_entries 
    WHERE id = NEW.journal_entry_id;

    -- Only posted entries must strictly balance
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

-- Deferred constraint trigger: Fires at COMMIT time after all lines for the entry are inserted
DROP TRIGGER IF EXISTS trg_enforce_ledger_balance ON ledger.lines;
CREATE CONSTRAINT TRIGGER trg_enforce_ledger_balance
AFTER INSERT OR UPDATE ON ledger.lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION ledger.fn_check_journal_entry_balance();
