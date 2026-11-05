-- Migration 000013 Down: Revert B2B & B2C Architecture Enhancements

DROP TABLE IF EXISTS iam.team_invitations CASCADE;
DROP TABLE IF EXISTS iam.kyc_documents CASCADE;
DROP TABLE IF EXISTS commerce.customer_addresses CASCADE;
DROP TABLE IF EXISTS commerce.merchant_receiving_warehouses CASCADE;

ALTER TABLE ledger.accounts 
    DROP CONSTRAINT IF EXISTS accounts_owner_type_check,
    ADD CONSTRAINT accounts_owner_type_check 
        CHECK (owner_type IN ('platform', 'supplier', 'merchant'));

ALTER TABLE catalog.supplier_offers
    DROP COLUMN IF EXISTS retail_price,
    DROP COLUMN IF EXISTS b2c_enabled,
    DROP COLUMN IF EXISTS b2b_enabled;

ALTER TABLE commerce.orders 
    DROP CONSTRAINT IF EXISTS chk_orders_ownership;

ALTER TABLE commerce.orders 
    DROP COLUMN IF EXISTS order_type;
