-- Migration 000006: Inventory and Warehouses Schema
CREATE SCHEMA IF NOT EXISTS inventory;

-- Warehouses (Fulfillment hubs owned by suppliers or platform)
CREATE TABLE IF NOT EXISTS inventory.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES iam.organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g. "RUH-01", "JED-02"
    name TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'SA',
    city TEXT NOT NULL,
    address_line TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- Warehouse Inventory per Supplier Offer
CREATE TABLE IF NOT EXISTS inventory.warehouse_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES catalog.supplier_offers(id) ON DELETE CASCADE,
    on_hand INT NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
    reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    reorder_threshold INT NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(warehouse_id, offer_id)
);

-- Stock Reservations (Temporary holds during checkout lease)
CREATE TABLE IF NOT EXISTS inventory.stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES catalog.supplier_offers(id),
    warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id),
    cart_session_id TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'committed', 'released')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory Adjustments Audit Trail
CREATE TABLE IF NOT EXISTS inventory.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id),
    offer_id UUID NOT NULL REFERENCES catalog.supplier_offers(id),
    previous_quantity INT NOT NULL,
    adjustment_quantity INT NOT NULL, -- can be positive or negative
    new_quantity INT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('shipment_received', 'order_fulfillment', 'damaged_goods', 'inventory_audit', 'return_restock')),
    reference_id TEXT,
    adjusted_by UUID REFERENCES iam.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_offer ON inventory.warehouse_stock(offer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_expiry ON inventory.stock_reservations(expires_at) WHERE status = 'active';
