-- Migration 000013: B2B & B2C Architecture Enhancements (DEP-01 to DEP-10)

-- 1. Extend Commerce Orders for B2B & B2C Isolation
ALTER TABLE commerce.orders 
    ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'b2b' CHECK (order_type IN ('b2b', 'b2c'));

ALTER TABLE commerce.orders 
    ALTER COLUMN merchant_id DROP NOT NULL;

ALTER TABLE commerce.orders 
    DROP CONSTRAINT IF EXISTS chk_orders_ownership,
    ADD CONSTRAINT chk_orders_ownership CHECK (
        (order_type = 'b2b' AND merchant_id IS NOT NULL AND user_id IS NOT NULL) OR
        (order_type = 'b2c' AND merchant_id IS NULL AND user_id IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS idx_orders_type_user ON commerce.orders(order_type, user_id);
CREATE INDEX IF NOT EXISTS idx_orders_type_merchant ON commerce.orders(order_type, merchant_id);

-- 2. Extend Supplier Offers for Dual-Channel Pricing & Shared Stock Pool
ALTER TABLE catalog.supplier_offers
    ADD COLUMN IF NOT EXISTS b2b_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS b2c_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS retail_price BIGINT;

-- Backfill retail_price from price if null
UPDATE catalog.supplier_offers SET retail_price = price WHERE retail_price IS NULL;

-- 3. Extend Ledger Accounts to support 'customer' owner_type (Account 2050)
ALTER TABLE ledger.accounts 
    DROP CONSTRAINT IF EXISTS accounts_owner_type_check,
    ADD CONSTRAINT accounts_owner_type_check 
        CHECK (owner_type IN ('platform', 'supplier', 'merchant', 'customer'));

-- 4. Merchant Receiving Warehouses (B2B Commercial Delivery Docks)
CREATE TABLE IF NOT EXISTS commerce.merchant_receiving_warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES iam.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'SA',
    city TEXT NOT NULL,
    address_line TEXT NOT NULL,
    dock_type TEXT NOT NULL DEFAULT 'standard_bay',
    has_forklift BOOLEAN DEFAULT FALSE,
    receiving_hours TEXT,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_merchant_receiving_wh_org ON commerce.merchant_receiving_warehouses(organization_id);

-- 5. Customer Addresses (B2C Personal Address Book)
CREATE TABLE IF NOT EXISTS commerce.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Home',
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT,
    street_address TEXT NOT NULL,
    building_number TEXT,
    floor_number TEXT,
    apartment_number TEXT,
    postal_code TEXT,
    delivery_instructions TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON commerce.customer_addresses(user_id);

-- 6. Corporate KYC Documents (CR & VAT verification)
CREATE TABLE IF NOT EXISTS iam.kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES iam.organizations(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'commercial_registration', 'vat_certificate', 'national_id', 'power_of_attorney'
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_by UUID REFERENCES iam.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES iam.users(id) ON DELETE SET NULL,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_docs_org ON iam.kyc_documents(organization_id);

-- 7. Team Invitations (B2B Merchant RBAC Employee Management)
CREATE TABLE IF NOT EXISTS iam.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES iam.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role_name TEXT NOT NULL DEFAULT 'procurement_specialist',
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    invited_by UUID REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_org ON iam.team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON iam.team_invitations(token);
