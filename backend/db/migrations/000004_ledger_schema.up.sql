-- Migration 000004: Ledger Schema (Immutable Double-Entry Accounting)
CREATE SCHEMA IF NOT EXISTS ledger;

-- Chart of Accounts
-- 1010: Gateway Clearing (Asset)
-- 1020: Platform Operating Bank (Asset)
-- 2010: Merchant Wallet Deposit (Liability)
-- 2020: Supplier Escrow Pending Settlement (Liability)
-- 2030: Supplier Available Payable (Liability)
-- 4010: Marketplace Commission Revenue (Revenue)
-- 4020: Shipping Revenue (Revenue)
CREATE TABLE IF NOT EXISTS ledger.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type TEXT NOT NULL CHECK (owner_type IN ('platform', 'supplier', 'merchant')),
    owner_id UUID NOT NULL, -- references organizations(id)
    currency TEXT NOT NULL DEFAULT 'USD',
    account_code TEXT NOT NULL, -- e.g. '2030'
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner_id, currency, account_code)
);

-- Journal Entries (Header record)
CREATE TABLE IF NOT EXISTS ledger.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number TEXT UNIQUE NOT NULL, -- e.g. "JE-884291"
    reference_type TEXT NOT NULL,      -- 'order', 'refund', 'payout', 'topup'
    reference_id UUID NOT NULL,
    action TEXT NOT NULL,              -- 'payment_received', 'settlement_cleared', 'commission_deducted'
    description TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed')),
    idempotency_key TEXT UNIQUE NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ledger Lines (Debits and Credits must balance)
CREATE TABLE IF NOT EXISTS ledger.lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES ledger.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES ledger.accounts(id),
    entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    amount BIGINT NOT NULL CHECK (amount > 0), -- Stored in minor units (e.g. cents)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supplier Payout / Withdrawal Requests
CREATE TABLE IF NOT EXISTS ledger.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_number TEXT UNIQUE NOT NULL, -- e.g. "PO-6218"
    supplier_id UUID NOT NULL REFERENCES iam.organizations(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    bank_name TEXT NOT NULL,
    iban TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
    risk_flag TEXT DEFAULT 'Clear',
    approved_by UUID REFERENCES iam.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entry_ref ON ledger.journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_lines_account ON ledger.lines(account_id);
CREATE INDEX IF NOT EXISTS idx_payouts_supplier ON ledger.payout_requests(supplier_id);
