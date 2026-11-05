-- Demo Seed Data: Development & Testing Only (DO NOT LOAD IN PRODUCTION)
-- Requires system_seed.sql to be executed first.

-- 1. Demo Organizations
INSERT INTO iam.organizations (id, type, name, legal_name, commercial_reg_no, country_code, status)
VALUES 
    ('b0000000-0000-0000-0000-000000000002', 'supplier', '{"en": "Noura Foods & Technology", "ar": "نورا للأغذية والتقنية"}', 'Noura Foods Trading Co.', 'SA-1010847291', 'SA', 'approved'),
    ('b0000000-0000-0000-0000-000000000003', 'supplier', '{"en": "Atlas Industrial GmbH", "ar": "أطلس الصناعية"}', 'Atlas Industrial Supplies GmbH', 'HRB 918245', 'DE', 'approved'),
    ('b0000000-0000-0000-0000-000000000004', 'merchant', '{"en": "Meridian Labs", "ar": "مختبرات ميريديان"}', 'Meridian Applied Sciences Ltd.', 'SA-2040192841', 'SA', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Users (Password: NexusPassword2026!)
INSERT INTO iam.users (id, email, password_hash, first_name, last_name, email_verified, status, locale)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'amal@nexus.market', '$2a$12$75BiaKtaaOJOsdiSkyENcOdnn6D1v0ba726fErpC2mi0JDwFQUxfq', 'Amal', 'Mansour', TRUE, 'active', 'en'),
    ('a0000000-0000-0000-0000-000000000002', 'rami@nexus.market', '$2a$12$75BiaKtaaOJOsdiSkyENcOdnn6D1v0ba726fErpC2mi0JDwFQUxfq', 'Rami', 'Khoury', TRUE, 'active', 'en'),
    ('a0000000-0000-0000-0000-000000000003', 'supplier@nourafoods.com', '$2a$12$75BiaKtaaOJOsdiSkyENcOdnn6D1v0ba726fErpC2mi0JDwFQUxfq', 'Noura', 'Admin', TRUE, 'active', 'en'),
    ('a0000000-0000-0000-0000-000000000004', 'buyer@meridian.com', '$2a$12$75BiaKtaaOJOsdiSkyENcOdnn6D1v0ba726fErpC2mi0JDwFQUxfq', 'Tariq', 'Buyer', TRUE, 'active', 'en')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 3. Demo Memberships
INSERT INTO iam.org_memberships (user_id, org_id, role_id, status)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'active'),
    ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'active'),
    ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002', 'active'),
    ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000003', 'active')
ON CONFLICT (user_id, org_id) DO UPDATE SET role_id = EXCLUDED.role_id;

-- 4. Demo Brands
INSERT INTO catalog.brands (id, name, slug)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'Nova Audio', 'nova-audio'),
    ('d0000000-0000-0000-0000-000000000002', 'Orbit Gear', 'orbit-gear'),
    ('d0000000-0000-0000-0000-000000000003', 'Motion Labs', 'motion-labs'),
    ('d0000000-0000-0000-0000-000000000004', 'Vista Pro', 'vista-pro')
ON CONFLICT (id) DO NOTHING;

-- 5. Demo Products
INSERT INTO catalog.products (id, sku, gtin, name, slug, description, brand_id, category_id, attributes, status)
VALUES 
    ('e0000000-0000-0000-0000-000000000001', 'NV-X1-BLK', '6291108472219',
     '{"en": "Nova X1 Wireless Noise-Cancelling Headphones", "ar": "سماعات نوفا إكس 1 اللاسلكية العازلة للضوضاء"}',
     '{"en": "nova-x1-headphones", "ar": "nova-x1-headphones"}',
     '{"en": "Studio-grade ANC headphones with 40h battery.", "ar": "سماعات عازلة للضوضاء تدوم 40 ساعة."}',
     'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
     '{"battery": "40h", "connectivity": "Bluetooth 5.3", "warranty": "24 months"}', 'approved'),

    ('e0000000-0000-0000-0000-000000000002', 'ORB-DK-8', '6291182159333',
     '{"en": "Orbit 8-in-1 Aluminum USB-C Docking Station", "ar": "محطة إرساء أوربت 8 في 1 ألومنيوم تايب سي"}',
     '{"en": "orbit-dock-8", "ar": "orbit-dock-8"}',
     '{"en": "Dual 4K HDMI, 100W PD pass-through, GbE.", "ar": "مخرج شاشتين بدقة 4K HDMI وشحن 100 واط."}',
     'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003',
     '{"ports": "Dual HDMI + 3x USB 3.2", "power": "100W PD"}', 'approved'),

    ('e0000000-0000-0000-0000-000000000003', 'MOT-KB-M2', '6291847291024',
     '{"en": "Motion M2 Wireless Mechanical Keyboard", "ar": "لوحة مفاتيح ميكانيكية لاسلكية موشن إم 2"}',
     '{"en": "motion-m2-keyboard", "ar": "motion-m2-keyboard"}',
     '{"en": "75% compact layout with pre-lubed linear switches.", "ar": "تصميم مضغوط 75% مع مفاتيح خطية مشحمة مسبقاً."}',
     'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003',
     '{"switch": "Gateron Yellow Pro", "layout": "75%", "rgb": "Per-key ARGB"}', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 6. Demo Offers & Tiers
INSERT INTO catalog.supplier_offers (id, product_id, supplier_id, supplier_sku, currency, price, moq, price_tiers, lead_time_days, status)
VALUES 
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
     'NF-NV-X1', 'USD', 12000, 1,
     '[{"minQty": 1, "maxQty": 49, "price": 12000}, {"minQty": 50, "maxQty": 99, "price": 11000}, {"minQty": 100, "maxQty": "+", "price": 9800}]'::jsonb,
     3, 'active'),

    ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
     'AT-NVX1-EU', 'USD', 12500, 5,
     '[{"minQty": 5, "maxQty": 24, "price": 12500}, {"minQty": 25, "maxQty": "+", "price": 11500}]'::jsonb,
     5, 'active')
ON CONFLICT (id) DO NOTHING;

-- 7. Demo Warehouses & Stock
INSERT INTO inventory.warehouses (id, organization_id, code, name, city, address_line)
VALUES 
    ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'RUH-01', 'Riyadh Central Distribution Hub', 'Riyadh', 'Exit 18, Industrial Area'),
    ('10000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'FRA-01', 'Frankfurt Logistics Center', 'Frankfurt', 'Airport Cargo City South')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory.warehouse_stock (warehouse_id, offer_id, on_hand, reserved, reorder_threshold)
VALUES 
    ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 128, 12, 10),
    ('10000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 48, 5, 10)
ON CONFLICT (warehouse_id, offer_id) DO NOTHING;

-- 8. Demo User Accounts
INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
VALUES 
    ('20000000-0000-0000-0000-000000002010', 'merchant', 'b0000000-0000-0000-0000-000000000004', 'USD', '2010', 'Meridian Labs Merchant Wallet'),
    ('20000000-0000-0000-0000-000000002020', 'supplier', 'b0000000-0000-0000-0000-000000000002', 'USD', '2020', 'Noura Foods Escrow Liability Account'),
    ('20000000-0000-0000-0000-000000002030', 'supplier', 'b0000000-0000-0000-0000-000000000002', 'USD', '2030', 'Noura Foods Available Payable Balance')
ON CONFLICT (id) DO NOTHING;
