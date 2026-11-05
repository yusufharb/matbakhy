-- Migration 000002 Rollback: Drop Catalog Schema
DROP TABLE IF EXISTS catalog.supplier_offers CASCADE;
DROP TABLE IF EXISTS catalog.product_variants CASCADE;
DROP TABLE IF EXISTS catalog.products CASCADE;
DROP TABLE IF EXISTS catalog.brands CASCADE;
DROP TABLE IF EXISTS catalog.categories CASCADE;
DROP SCHEMA IF EXISTS catalog CASCADE;
