-- Migration 000015: High-Performance Database Indexing & Query Optimization
-- Eliminates sequential table scans across high-traffic commerce, IAM, and catalog queries.

-- 1. Commerce Orders B2C Customer & Status Index
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON commerce.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON commerce.orders(order_type, status);

-- 2. Commerce Payments Lookup by Order
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON commerce.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON commerce.payments(gateway_reference) WHERE gateway_reference IS NOT NULL;

-- 3. Commerce Order Items Suborder Partitioning & Offer Lookup
CREATE INDEX IF NOT EXISTS idx_order_items_suborder ON commerce.order_items(suborder_id);
CREATE INDEX IF NOT EXISTS idx_order_items_offer ON commerce.order_items(offer_id);

-- 4. IAM Organization Membership Inverted Lookup (ListTeamMembers / Org RBAC)
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON iam.org_memberships(org_id);

-- 5. Catalog Products Brand Filter
CREATE INDEX IF NOT EXISTS idx_products_brand ON catalog.products(brand_id);

-- 6. Invoices Suborder Lookup
CREATE INDEX IF NOT EXISTS idx_invoices_suborder ON commerce.invoices(suborder_id);
