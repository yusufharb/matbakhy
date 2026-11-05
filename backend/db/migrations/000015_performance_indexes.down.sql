-- Migration 000015 Reversal: High-Performance Database Indexing
DROP INDEX IF EXISTS commerce.idx_orders_user_id;
DROP INDEX IF EXISTS commerce.idx_orders_type_status;
DROP INDEX IF EXISTS commerce.idx_payments_order_id;
DROP INDEX IF EXISTS commerce.idx_payments_gateway_ref;
DROP INDEX IF EXISTS commerce.idx_order_items_suborder;
DROP INDEX IF EXISTS commerce.idx_order_items_offer;
DROP INDEX IF EXISTS iam.idx_org_memberships_org;
DROP INDEX IF EXISTS catalog.idx_products_brand;
DROP INDEX IF EXISTS commerce.idx_invoices_suborder;
