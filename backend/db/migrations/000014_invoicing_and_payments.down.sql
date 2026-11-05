-- Migration 000014 Reversal: Production Invoicing & Payments Extension
DROP TABLE IF EXISTS commerce.invoices CASCADE;

ALTER TABLE commerce.payments
    DROP COLUMN IF EXISTS client_secret,
    DROP COLUMN IF EXISTS checkout_url;
