-- Migration 000003: Commerce Schema (Parent Orders, Supplier Suborders, Payments)
CREATE SCHEMA IF NOT EXISTS commerce;

-- Parent Orders (Buyer's unified checkout record)
CREATE TABLE IF NOT EXISTS commerce.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES iam.organizations(id),
    user_id UUID NOT NULL REFERENCES iam.users(id),
    currency TEXT NOT NULL DEFAULT 'USD',
    subtotal BIGINT NOT NULL, -- minor units
    tax_total BIGINT NOT NULL DEFAULT 0,
    shipping_total BIGINT NOT NULL DEFAULT 0,
    discount_total BIGINT NOT NULL DEFAULT 0,
    grand_total BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
        'pending_payment', 'confirmed', 'processing', 'partially_shipped',
        'shipped', 'partially_delivered', 'delivered', 'completed', 'cancelled', 'refunded'
    )),
    delivery_address JSONB NOT NULL,
    payment_method TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supplier Suborders (Individual fulfillment records partitioned per vendor)
CREATE TABLE IF NOT EXISTS commerce.suborders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suborder_number TEXT UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES iam.organizations(id),
    subtotal BIGINT NOT NULL,
    tax_total BIGINT NOT NULL DEFAULT 0,
    shipping_total BIGINT NOT NULL DEFAULT 0,
    discount_total BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL,
    commission_rate NUMERIC(5,4) NOT NULL, -- e.g. 0.1000 for 10%
    commission_amount BIGINT NOT NULL,
    supplier_payable BIGINT NOT NULL, -- total - commission_amount
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
        'new', 'accepted', 'packing', 'ready_for_pickup', 'shipped', 'delivered', 'rejected', 'cancelled'
    )),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order Items (Historical Snapshot)
CREATE TABLE IF NOT EXISTS commerce.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suborder_id UUID NOT NULL REFERENCES commerce.suborders(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES catalog.supplier_offers(id),
    product_snapshot JSONB NOT NULL, -- title, brand, sku, specs at time of purchase
    offer_snapshot JSONB NOT NULL,   -- unit price, tier applied, moq at time of purchase
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price BIGINT NOT NULL,
    total_price BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS commerce.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES commerce.orders(id),
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    method TEXT NOT NULL, -- 'wallet', 'credit_card', 'bank_transfer'
    gateway TEXT,
    gateway_reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_merchant ON commerce.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON commerce.orders(status);
CREATE INDEX IF NOT EXISTS idx_suborders_supplier ON commerce.suborders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_suborders_order ON commerce.suborders(order_id);
