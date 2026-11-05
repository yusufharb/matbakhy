-- Migration 000011: Financial Enhancements & Idempotency Store
CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.idempotency_keys (
    key TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    user_id UUID,
    request_hash TEXT NOT NULL,
    status_code INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ON platform.idempotency_keys (created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_scope_user ON platform.idempotency_keys (scope, user_id);
