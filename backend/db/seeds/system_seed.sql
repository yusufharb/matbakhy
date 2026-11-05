-- System Baseline Seed (Production Safe)
-- Only seeds system defaults, standard categories, platform organization, and platform accounts.
-- Contains ZERO demo passwords or dummy user accounts.

-- 1. Platform Organization
INSERT INTO iam.organizations (id, type, name, legal_name, commercial_reg_no, country_code, status)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'platform', '{"en": "Nexus Marketplace Platform", "ar": "منصة نكسس التجارية"}', 'Nexus Platform Technologies LLC', 'PLT-001', 'SA', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 2. Standard System Categories
INSERT INTO catalog.categories (id, name, slug, path, depth)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', '{"en": "Electronics", "ar": "إلكترونيات"}', '{"en": "electronics", "ar": "electronics"}', '1', 0),
    ('c0000000-0000-0000-0000-000000000002', '{"en": "Audio & Video", "ar": "صوتيات ومرئيات"}', '{"en": "audio-video", "ar": "audio-video"}', '1.2', 1),
    ('c0000000-0000-0000-0000-000000000003', '{"en": "Computers & Tablets", "ar": "كمبيوتر وملحقات"}', '{"en": "computers", "ar": "computers"}', '1.3', 1),
    ('c0000000-0000-0000-0000-000000000004', '{"en": "Business Supplies", "ar": "مستلزمات الأعمال"}', '{"en": "business-supplies", "ar": "business-supplies"}', '1.4', 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Standard Platform Accounts (Double-Entry Ledger)
INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
VALUES 
    ('20000000-0000-0000-0000-000000001010', 'platform', 'b0000000-0000-0000-0000-000000000001', 'USD', '1010', 'Gateway Clearing Asset Account'),
    ('20000000-0000-0000-0000-000000001020', 'platform', 'b0000000-0000-0000-0000-000000000001', 'USD', '1020', 'Platform Operating Bank Account'),
    ('20000000-0000-0000-0000-000000004010', 'platform', 'b0000000-0000-0000-0000-000000000001', 'USD', '4010', 'Platform Commission Revenue')
ON CONFLICT (id) DO NOTHING;

-- 4. Global Commission Policy Default
INSERT INTO platform.commission_rules (id, name, scope_type, scope_id, rate_percent, priority)
VALUES 
    ('40000000-0000-0000-0000-000000000001', 'Global Marketplace Default', 'global', NULL, 10.00, 0)
ON CONFLICT (id) DO NOTHING;

-- 5. Standard CMS Sections
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
