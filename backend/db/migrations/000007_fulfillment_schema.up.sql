-- Migration 000007: Fulfillment, Shipments, Disputes, and Returns Schema
CREATE SCHEMA IF NOT EXISTS fulfillment;

-- Shipments
CREATE TABLE IF NOT EXISTS fulfillment.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suborder_id UUID NOT NULL REFERENCES commerce.suborders(id) ON DELETE CASCADE,
    courier TEXT NOT NULL, -- e.g. 'DHL Express', 'Aramex', 'SMSA'
    tracking_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')),
    dispatched_at TIMESTAMPTZ,
    estimated_delivery TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shipment Tracking Events
CREATE TABLE IF NOT EXISTS fulfillment.tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES fulfillment.shipments(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disputes (Buyer claims against a supplier suborder)
CREATE TABLE IF NOT EXISTS commerce.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_number TEXT UNIQUE NOT NULL, -- e.g. "DIS-2025-001"
    suborder_id UUID NOT NULL REFERENCES commerce.suborders(id),
    buyer_id UUID NOT NULL REFERENCES iam.organizations(id),
    supplier_id UUID NOT NULL REFERENCES iam.organizations(id),
    reason TEXT NOT NULL CHECK (reason IN ('item_not_received', 'damaged_goods', 'defective_product', 'wrong_item', 'quantity_mismatch')),
    description TEXT NOT NULL,
    claim_amount BIGINT NOT NULL CHECK (claim_amount > 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_buyer', 'resolved_supplier', 'dismissed')),
    resolution_type TEXT CHECK (resolution_type IN ('full_refund', 'partial_refund', 'replacement', 'rejected')),
    resolved_by UUID REFERENCES iam.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dispute Evidence Files
CREATE TABLE IF NOT EXISTS commerce.dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES commerce.disputes(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES iam.users(id),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Returns
CREATE TABLE IF NOT EXISTS commerce.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number TEXT UNIQUE NOT NULL,
    suborder_id UUID NOT NULL REFERENCES commerce.suborders(id),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'item_shipped', 'item_received', 'refunded', 'rejected')),
    refund_amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refunds (Linked directly to original payment and ledger entry)
CREATE TABLE IF NOT EXISTS commerce.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_number TEXT UNIQUE NOT NULL, -- e.g. "RF-01982"
    order_id UUID NOT NULL REFERENCES commerce.orders(id),
    suborder_id UUID NOT NULL REFERENCES commerce.suborders(id),
    dispute_id UUID REFERENCES commerce.disputes(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_suborder ON fulfillment.shipments(suborder_id);
CREATE INDEX IF NOT EXISTS idx_disputes_suborder ON commerce.disputes(suborder_id);
