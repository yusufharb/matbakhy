-- Migration 000010: Standard System Roles, Permissions, and Default RBAC Mapping
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_roles_scope_name'
    ) THEN
        ALTER TABLE iam.roles ADD CONSTRAINT uq_roles_scope_name UNIQUE (scope, name);
    END IF;
END $$;

-- 1. Insert Standard System Roles
INSERT INTO iam.roles (id, name, scope, is_system)
VALUES 
    ('90000000-0000-0000-0000-000000000001', 'platform_admin', 'platform', TRUE),
    ('90000000-0000-0000-0000-000000000002', 'supplier_admin', 'supplier', TRUE),
    ('90000000-0000-0000-0000-000000000003', 'merchant_admin', 'merchant', TRUE)
ON CONFLICT (scope, name) DO NOTHING;

-- 2. Insert Standard Permissions
INSERT INTO iam.permissions (resource, action) VALUES
    ('supplier', 'approve'),
    ('supplier', 'reject'),
    ('supplier', 'read'),
    ('order', 'create'),
    ('order', 'read'),
    ('order', 'update_status'),
    ('inventory', 'adjust'),
    ('inventory', 'read'),
    ('ledger', 'post'),
    ('ledger', 'read'),
    ('payout', 'request'),
    ('payout', 'approve')
ON CONFLICT (resource, action) DO NOTHING;

-- 3. Map Permissions to Roles
-- Platform Admin gets all permissions
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r
CROSS JOIN iam.permissions p
WHERE r.name = 'platform_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Supplier Admin permissions
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r
JOIN iam.permissions p ON p.resource IN ('order', 'inventory', 'payout') AND p.action IN ('read', 'update_status', 'adjust', 'request')
WHERE r.name = 'supplier_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Merchant Admin permissions
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r
JOIN iam.permissions p ON p.resource IN ('order') AND p.action IN ('create', 'read')
WHERE r.name = 'merchant_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
