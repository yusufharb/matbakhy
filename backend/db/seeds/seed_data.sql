-- Seed Data: Marketplace Core Baseline Demo Data
-- Matches UI fixtures: Noura Foods, Atlas Industrial, Amal Mansour, Nova X1 Headphones

-- 1. Create Super Admin User & Demo Users (Password: NexusPassword2026!)
INSERT INTO iam.users (id, email, password_hash, first_name, last_name, email_verified, status, locale)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'amal@nexus.market', '$2a$12$75BiaKtaaOJOsdiSkyENcOdnn6D1v0ba726fErpC2mi0JDwFQUxfq', 'Amal', 'Mansour', TRUE, 'active', 'en'),
    ('a0000000-0000-0000-0000-000000000002', 'rami@nexus.market', '$2a$12$75BiaKtaaOJOsdiSkyENcOdnn6D1v0ba726fErpC2mi0JDwFQUxfq', 'Rami', 'Khoury', TRUE, 'active', 'en'),
    ('a0000000-0000-0000-0000-000000000003', 'supplier@nourafoods.com', '$2a$12$75BiaKtaaOJOsdiSkyENcOdnn6D1v0ba726fErpC2mi0JDwFQUxfq', 'Noura', 'Admin', TRUE, 'active', 'en'),
    ('a0000000-0000-0000-0000-000000000004', 'buyer@meridian.com', '$2a$12$75BiaKtaaOJOsdiSkyENcOdnn6D1v0ba726fErpC2mi0JDwFQUxfq', 'Tariq', 'Buyer', TRUE, 'active', 'en')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 2. Organizations
INSERT INTO iam.organizations (id, type, name, legal_name, commercial_reg_no, country_code, status)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'platform', '{"en": "Nexus Marketplace Platform", "ar": "منصة نكسس التجارية"}', 'Nexus Platform Technologies LLC', 'PLT-001', 'SA', 'approved'),
    ('b0000000-0000-0000-0000-000000000002', 'supplier', '{"en": "Noura Foods & Technology", "ar": "نورا للأغذية والتقنية"}', 'Noura Foods Trading Co.', 'SA-1010847291', 'SA', 'approved'),
    ('b0000000-0000-0000-0000-000000000003', 'supplier', '{"en": "Atlas Industrial GmbH", "ar": "أطلس الصناعية"}', 'Atlas Industrial Supplies GmbH', 'HRB 918245', 'DE', 'approved'),
    ('b0000000-0000-0000-0000-000000000004', 'merchant', '{"en": "Meridian Labs", "ar": "مختبرات ميريديان"}', 'Meridian Applied Sciences Ltd.', 'SA-2040192841', 'SA', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 2.1 Memberships (User <-> Org with Role)
INSERT INTO iam.org_memberships (user_id, org_id, role_id, status)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'active'),
    ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'active'),
    ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002', 'active'),
    ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000003', 'active')
ON CONFLICT (user_id, org_id) DO UPDATE SET role_id = EXCLUDED.role_id;

-- 3. Categories
INSERT INTO catalog.categories (id, name, slug, path, depth)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', '{"en": "Electronics", "ar": "إلكترونيات"}', '{"en": "electronics", "ar": "electronics"}', '1', 0),
    ('c0000000-0000-0000-0000-000000000002', '{"en": "Audio & Video", "ar": "صوتيات ومرئيات"}', '{"en": "audio-video", "ar": "audio-video"}', '1.2', 1),
    ('c0000000-0000-0000-0000-000000000003', '{"en": "Computers & Tablets", "ar": "كمبيوتر وملحقات"}', '{"en": "computers", "ar": "computers"}', '1.3', 1),
    ('c0000000-0000-0000-0000-000000000004', '{"en": "Business Supplies", "ar": "مستلزمات الأعمال"}', '{"en": "business-supplies", "ar": "business-supplies"}', '1.4', 1)
ON CONFLICT (id) DO NOTHING;

-- 4. Brands
INSERT INTO catalog.brands (id, name, slug)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'Nova Audio', 'nova-audio'),
    ('d0000000-0000-0000-0000-000000000002', 'Orbit Gear', 'orbit-gear'),
    ('d0000000-0000-0000-0000-000000000003', 'Motion Labs', 'motion-labs'),
    ('d0000000-0000-0000-0000-000000000004', 'Vista Pro', 'vista-pro')
ON CONFLICT (id) DO NOTHING;

-- 5. Global Products
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
     'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
     '{"switches": "Linear Yellow", "layout": "75% (84 keys)"}', 'approved'),

    ('e0000000-0000-0000-0000-000000000004', 'VIS-CAM-4K', '6291948201948',
     '{"en": "Vista Pro 4K AI Conference Webcam & Mic Array", "ar": "كاميرا اجتماعات ذكية بدقة 4K مع مصفوفة ميكروفونات"}',
     '{"en": "vista-cam-4k", "ar": "vista-cam-4k"}',
     '{"en": "Auto-framing ePTZ camera with dual noise-canceling beamforming mics.", "ar": "كاميرا بتأطير ذكي وميكروفونات عازلة للضوضاء."}',
     'd0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004',
     '{"resolution": "4K UHD @ 30fps", "mics": "4-mic beamforming"}', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 6. Supplier Commercial Offers
INSERT INTO catalog.supplier_offers (id, supplier_id, product_id, supplier_sku, price, moq, price_tiers, lead_time_days, status)
VALUES 
    -- Product 1: Nova X1 Headphones
    ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001',
     'NF-ANC-X1', 11900, 1, '[{"minQty": 1, "maxQty": 9, "price": 11900}, {"minQty": 10, "maxQty": 49, "price": 10900}, {"minQty": 50, "maxQty": "+", "price": 9900}]', 1, 'active'),

    ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001',
     'ATL-NV-X1', 11450, 5, '[{"minQty": 5, "maxQty": 19, "price": 11450}, {"minQty": 20, "maxQty": "+", "price": 10200}]', 4, 'active'),

    -- Product 2: Orbit Dock
    ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002',
     'NF-DOCK-8', 8450, 1, '[]', 2, 'active'),

    -- Product 3: Motion M2 Keyboard
    ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003',
     'NF-KEY-M2', 11900, 1, '[{"minQty": 1, "maxQty": 5, "price": 11900}, {"minQty": 6, "maxQty": "+", "price": 10500}]', 1, 'active'),

    -- Product 4: Vista Pro 4K Camera
    ('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004',
     'NF-CAM-4K', 22900, 1, '[]', 1, 'active'),

    ('f0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004',
     'ATL-CAM-4K', 21500, 2, '[]', 3, 'active')
ON CONFLICT (id) DO NOTHING;

-- 7. Warehouses
INSERT INTO inventory.warehouses (id, organization_id, code, name, city, address_line)
VALUES 
    ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'RUH-01', 'Riyadh Central Distribution Hub', 'Riyadh', 'Exit 18, Industrial Area'),
    ('10000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'JED-02', 'Jeddah West Port Warehouse', 'Jeddah', 'King Faisal Road'),
    ('10000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'FRA-01', 'Frankfurt Logistics Center', 'Frankfurt', 'Airport Cargo City South')
ON CONFLICT (id) DO NOTHING;

-- 8. Warehouse Stock
INSERT INTO inventory.warehouse_stock (warehouse_id, offer_id, on_hand, reserved, reorder_threshold)
VALUES 
    ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 128, 12, 10),
    ('10000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 42, 8, 5),
    ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', 18, 4, 5),
    ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 7, 3, 2),
    ('10000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 48, 5, 10)
ON CONFLICT (warehouse_id, offer_id) DO NOTHING;

-- 9. Chart of Accounts (Double-Entry Ledger)
INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
VALUES 
    ('20000000-0000-0000-0000-000000001010', 'platform', 'b0000000-0000-0000-0000-000000000001', 'USD', '1010', 'Gateway Clearing Asset Account'),
    ('20000000-0000-0000-0000-000000001020', 'platform', 'b0000000-0000-0000-0000-000000000001', 'USD', '1020', 'Platform Operating Bank Account'),
    ('20000000-0000-0000-0000-000000004010', 'platform', 'b0000000-0000-0000-0000-000000000001', 'USD', '4010', 'Platform Commission Revenue'),
    ('20000000-0000-0000-0000-000000002010', 'merchant', 'b0000000-0000-0000-0000-000000000004', 'USD', '2010', 'Meridian Labs Merchant Wallet'),
    ('20000000-0000-0000-0000-000000002020', 'supplier', 'b0000000-0000-0000-0000-000000000002', 'USD', '2020', 'Noura Foods Escrow Liability Account'),
    ('20000000-0000-0000-0000-000000002030', 'supplier', 'b0000000-0000-0000-0000-000000000002', 'USD', '2030', 'Noura Foods Available Payable Balance')
ON CONFLICT (id) DO NOTHING;

-- 10. Sample Balanced Journal Entry (Order Payment Clearance: DR Gateway $1,284.00, CR Escrow $1,155.60, CR Commission $128.40)
INSERT INTO ledger.journal_entries (id, entry_number, reference_type, reference_id, action, description, currency, status, idempotency_key)
VALUES 
    ('30000000-0000-0000-0000-000000000001', 'JE-884291', 'order', 'e0000000-0000-0000-0000-000000000001',
     'payment_cleared', 'Gateway clearing to supplier escrow and commission revenue', 'USD', 'posted', 'idem-je-884291')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ledger.lines (journal_entry_id, account_id, entry_type, amount)
VALUES 
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000001010', 'debit', 128400),
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000002020', 'credit', 115560),
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000004010', 'credit', 12840);

-- 11. Commission Rules
INSERT INTO platform.commission_rules (id, name, scope_type, scope_id, rate_percent, priority)
VALUES 
    ('40000000-0000-0000-0000-000000000001', 'Global Marketplace Default', 'global', NULL, 10.00, 0),
    ('40000000-0000-0000-0000-000000000002', 'Electronics Override', 'category', 'c0000000-0000-0000-0000-000000000001', 7.00, 10),
    ('40000000-0000-0000-0000-000000000003', 'Atlas Custom Agreement', 'supplier', 'b0000000-0000-0000-0000-000000000003', 5.50, 20)
ON CONFLICT (id) DO NOTHING;

-- 12. Persistent CMS Sections
INSERT INTO platform.cms_sections (id, name, section_type, sort_order, is_active, content_en, content_ar)
VALUES 
    ('50000000-0000-0000-0000-000000000001', 'Hero Marketing Carousel', 'hero_carousel', 1, TRUE, 
     '{"eyebrow": "BUILT FOR MODERN BUSINESS", "headline": "Everything your business needs, in one marketplace.", "cta": "Explore Marketplace"}',
     '{"eyebrow": "مصمم للأعمال الحديثة", "headline": "كل ما يحتاجه عملك، في سوق واحد.", "cta": "استكشف السوق"}'),
    ('50000000-0000-0000-0000-000000000002', 'Top Categories Grid', 'category_grid', 2, TRUE,
     '{"title": "Browse Top Categories", "items": ["Electronics", "Computers", "Business Supplies"]}',
     '{"title": "تصفح أهم الفئات", "items": ["إلكترونيات", "كمبيوتر", "مستلزمات الأعمال"]}'),
    ('50000000-0000-0000-0000-000000000003', 'Featured Wholesale Products', 'featured_products', 3, TRUE,
     '{"title": "Trending Wholesale Products"}',
     '{"title": "منتجات الجملة الأكثر طلباً"}')
ON CONFLICT (id) DO NOTHING;
