-- Migration 000006 Rollback: Drop Inventory Schema
DROP TABLE IF EXISTS inventory.stock_adjustments CASCADE;
DROP TABLE IF EXISTS inventory.stock_reservations CASCADE;
DROP TABLE IF EXISTS inventory.warehouse_stock CASCADE;
DROP TABLE IF EXISTS inventory.warehouses CASCADE;
DROP SCHEMA IF EXISTS inventory CASCADE;
