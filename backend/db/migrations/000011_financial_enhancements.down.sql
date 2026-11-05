-- Migration 000011 Rollback: Drop Idempotency Keys Table
DROP TABLE IF EXISTS platform.idempotency_keys CASCADE;
