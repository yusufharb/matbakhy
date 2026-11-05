-- Migration 000004 Rollback: Drop Ledger Schema
DROP TABLE IF EXISTS ledger.payout_requests CASCADE;
DROP TABLE IF EXISTS ledger.lines CASCADE;
DROP TABLE IF EXISTS ledger.journal_entries CASCADE;
DROP TABLE IF EXISTS ledger.accounts CASCADE;
DROP SCHEMA IF EXISTS ledger CASCADE;
