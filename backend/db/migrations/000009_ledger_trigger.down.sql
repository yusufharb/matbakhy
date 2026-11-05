-- Migration 000009 Rollback: Drop Ledger Balance Constraint Trigger
DROP TRIGGER IF EXISTS trg_enforce_ledger_balance ON ledger.lines;
DROP FUNCTION IF EXISTS ledger.fn_check_journal_entry_balance();
