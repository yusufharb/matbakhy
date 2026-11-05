-- Migration 000003 Rollback: Drop Commerce Schema
DROP TABLE IF EXISTS commerce.payments CASCADE;
DROP TABLE IF EXISTS commerce.order_items CASCADE;
DROP TABLE IF EXISTS commerce.suborders CASCADE;
DROP TABLE IF EXISTS commerce.orders CASCADE;
DROP SCHEMA IF EXISTS commerce CASCADE;
