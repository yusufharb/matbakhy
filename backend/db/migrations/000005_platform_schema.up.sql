-- Migration 000005: Platform Schema (Commission Rules, Configurations, Outbox, Audit)
CREATE SCHEMA IF NOT EXISTS platform;

-- Commission Policy Rules (Hierarchical resolution)
CREATE TABLE IF NOT EXISTS platform.commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'category', 'supplier', 'tier')),
    scope_id UUID, -- category_id or supplier_id
    rate_percent NUMERIC(5,2) NOT NULL, -- e.g. 10.00 for 10%
    priority INT NOT NULL DEFAULT 0, -- Higher number = higher precedence
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform Configurations & Feature Flags
CREATE TABLE IF NOT EXISTS platform.configurations (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES iam.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactional Outbox Pattern for Asynchronous Events
CREATE TABLE IF NOT EXISTS platform.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL, -- 'order', 'payment', 'product', 'supplier'
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,     -- 'OrderPlaced', 'PaymentConfirmed', 'SupplierApproved'
    payload JSONB NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable Security & Operational Audit Log
CREATE TABLE IF NOT EXISTS platform.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES iam.users(id),
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    origin_ip TEXT NOT NULL,
    proof_hash TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON platform.outbox_events(created_at) WHERE published = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_created ON platform.audit_logs(created_at DESC);
