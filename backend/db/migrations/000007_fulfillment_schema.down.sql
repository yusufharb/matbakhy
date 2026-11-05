-- Migration 000007 Rollback: Drop Fulfillment Schema and Returns/Disputes
DROP TABLE IF EXISTS commerce.refunds CASCADE;
DROP TABLE IF EXISTS commerce.returns CASCADE;
DROP TABLE IF EXISTS commerce.dispute_evidence CASCADE;
DROP TABLE IF EXISTS commerce.disputes CASCADE;
DROP TABLE IF EXISTS fulfillment.tracking_events CASCADE;
DROP TABLE IF EXISTS fulfillment.shipments CASCADE;
DROP SCHEMA IF EXISTS fulfillment CASCADE;
