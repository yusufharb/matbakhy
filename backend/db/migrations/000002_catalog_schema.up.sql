-- Migration 000002: Catalog Schema (Shared Products & Supplier Offers)
CREATE SCHEMA IF NOT EXISTS catalog;

-- Categories (Nested Hierarchy with Attribute Schemas)
CREATE TABLE IF NOT EXISTS catalog.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES catalog.categories(id) ON DELETE SET NULL,
    name JSONB NOT NULL,
    slug JSONB NOT NULL,
    depth INT NOT NULL DEFAULT 0,
    path TEXT NOT NULL,
    attribute_schema JSONB DEFAULT '[]', -- e.g. [{"name": "Warranty", "type": "number", "required": true}]
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brands
CREATE TABLE IF NOT EXISTS catalog.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global Products (Platform-owned identity)
CREATE TABLE IF NOT EXISTS catalog.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    gtin TEXT,
    barcode TEXT,
    name JSONB NOT NULL,
    slug JSONB NOT NULL,
    description JSONB,
    brand_id UUID REFERENCES catalog.brands(id),
    category_id UUID NOT NULL REFERENCES catalog.categories(id),
    attributes JSONB DEFAULT '{}', -- Category dynamic attribute values
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived')),
    submitted_by UUID REFERENCES iam.organizations(id),
    approved_by UUID REFERENCES iam.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product Variants
CREATE TABLE IF NOT EXISTS catalog.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    name JSONB NOT NULL,
    attributes JSONB NOT NULL, -- {"color": "black", "size": "XL"}
    images JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supplier Commercial Offers (The Core Multi-Vendor Offer Model)
CREATE TABLE IF NOT EXISTS catalog.supplier_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES iam.organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES catalog.product_variants(id) ON DELETE SET NULL,
    supplier_sku TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    price BIGINT NOT NULL, -- Stored in minor units (e.g. cents, 11900 = $119.00)
    compare_price BIGINT,
    moq INT NOT NULL DEFAULT 1, -- Minimum Order Quantity
    max_qty INT,
    price_tiers JSONB DEFAULT '[]', -- [{"minQty": 10, "maxQty": 49, "price": 10900}]
    lead_time_days INT DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock', 'suspended')),
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(supplier_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON catalog.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON catalog.products(status);
CREATE INDEX IF NOT EXISTS idx_offers_product ON catalog.supplier_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_supplier ON catalog.supplier_offers(supplier_id);
