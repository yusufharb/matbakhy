-- Migration 000014: Production Invoicing & Payments Extension
CREATE SCHEMA IF NOT EXISTS commerce;

-- 1. Extend commerce.payments with checkout session references
ALTER TABLE commerce.payments
    ADD COLUMN IF NOT EXISTS client_secret TEXT,
    ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- 2. Create commerce.invoices table for B2B/B2C Tax Invoices & ZATCA e-invoicing compliance
CREATE TABLE IF NOT EXISTS commerce.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
    suborder_id UUID REFERENCES commerce.suborders(id) ON DELETE SET NULL,
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('standard', 'tax_invoice', 'simplified_tax_invoice')),
    seller_name TEXT NOT NULL,
    seller_tax_id TEXT,
    seller_cr_number TEXT,
    buyer_name TEXT NOT NULL,
    buyer_tax_id TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    subtotal_cents BIGINT NOT NULL,
    tax_cents BIGINT NOT NULL,
    grand_total_cents BIGINT NOT NULL,
    qr_code_tlv TEXT,
    pdf_url TEXT,
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order ON commerce.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON commerce.invoices(invoice_number);
