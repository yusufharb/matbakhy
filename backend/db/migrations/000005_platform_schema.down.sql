-- Migration 000005 Rollback: Drop Platform Schema
DROP TABLE IF EXISTS platform.audit_logs CASCADE;
DROP TABLE IF EXISTS platform.outbox_events CASCADE;
DROP TABLE IF EXISTS platform.configurations CASCADE;
DROP TABLE IF EXISTS platform.commission_rules CASCADE;
DROP SCHEMA IF EXISTS platform CASCADE;
