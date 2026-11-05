-- NEXUS MRO & Industrial Supplies Client Vertical Seed
-- Production-ready verticalization for B2B industrial procurement and B2C prosumer hardware

-- 1. Industrial Categories
INSERT INTO catalog.categories (id, name, slug, path, depth)
VALUES 
    ('c0000000-0000-0000-0000-000000000010', '{"en": "Heavy Power Tools & Machinery", "ar": "أدوات ومعدات كهربائية ثقيلة"}', '{"en": "power-tools", "ar": "power-tools"}', '10', 0),
    ('c0000000-0000-0000-0000-000000000011', '{"en": "Electrical & Automation", "ar": "كهرباء وتحكم صناعي"}', '{"en": "electrical-automation", "ar": "electrical-automation"}', '11', 0),
    ('c0000000-0000-0000-0000-000000000012', '{"en": "Safety Gear & PPE Workwear", "ar": "معدات السلامة والوقاية المهنية"}', '{"en": "safety-ppe", "ar": "safety-ppe"}', '12', 0),
    ('c0000000-0000-0000-0000-000000000013', '{"en": "Fasteners, Welding & Fabrication", "ar": "مثبتات ومستلزمات لحام وتصنيع"}', '{"en": "fasteners-welding", "ar": "fasteners-welding"}', '13', 0),
    ('c0000000-0000-0000-0000-000000000014', '{"en": "Pumps, Valves & Fluid Handling", "ar": "مضخات وصمامات هيدروليكية"}', '{"en": "pumps-valves", "ar": "pumps-valves"}', '14', 0)
ON CONFLICT (id) DO NOTHING;

-- 2. Certified Industrial Brands
INSERT INTO catalog.brands (id, name, slug, logo_url)
VALUES 
    ('d0000000-0000-0000-0000-000000000010', 'Bosch Professional', 'bosch-pro', 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=128&auto=format&fit=crop&q=80'),
    ('d0000000-0000-0000-0000-000000000011', 'Schneider Electric', 'schneider-electric', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=128&auto=format&fit=crop&q=80'),
    ('d0000000-0000-0000-0000-000000000012', '3M Safety', '3m-safety', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=128&auto=format&fit=crop&q=80'),
    ('d0000000-0000-0000-0000-000000000013', 'Makita Industrial', 'makita-industrial', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=128&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- 3. Verified Industrial Suppliers
INSERT INTO iam.organizations (id, type, name, legal_name, commercial_reg_no, tax_id, country_code, status)
VALUES 
    ('b0000000-0000-0000-0000-000000000021', 'supplier', '{"en": "Atlas Industrial Equipment Est.", "ar": "مؤسسة أطلس للمعدات الصناعية"}', 'Atlas Industrial Equipment Co. Ltd.', '1010887766', '310123456700003', 'SA', 'approved'),
    ('b0000000-0000-0000-0000-000000000022', 'supplier', '{"en": "Gulf Power & Electrical Contracting", "ar": "شركة الخليج للطاقة والمقاولات الكهربائية"}', 'Gulf Power Systems Trading LLC', '1010554433', '310987654300003', 'SA', 'approved'),
    ('b0000000-0000-0000-0000-000000000023', 'supplier', '{"en": "Arabian Safety & PPE Trading Co.", "ar": "الشركة العربية لتجارة معدات السلامة"}', 'Arabian PPE & Industrial Safety Solutions', '1010221100', '310456789000003', 'SA', 'approved')
ON CONFLICT (id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    commercial_reg_no = EXCLUDED.commercial_reg_no,
    tax_id = EXCLUDED.tax_id;

-- 4. Supplier Escrow & Payable Accounts (Double-Entry Ledger)
INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
VALUES 
    (gen_random_uuid(), 'supplier', 'b0000000-0000-0000-0000-000000000021', 'USD', '2020', 'Atlas Industrial Escrow Account'),
    (gen_random_uuid(), 'supplier', 'b0000000-0000-0000-0000-000000000021', 'USD', '2030', 'Atlas Industrial Payable Account'),
    (gen_random_uuid(), 'supplier', 'b0000000-0000-0000-0000-000000000022', 'USD', '2020', 'Gulf Power Escrow Account'),
    (gen_random_uuid(), 'supplier', 'b0000000-0000-0000-0000-000000000022', 'USD', '2030', 'Gulf Power Payable Account'),
    (gen_random_uuid(), 'supplier', 'b0000000-0000-0000-0000-000000000023', 'USD', '2020', 'Arabian Safety Escrow Account'),
    (gen_random_uuid(), 'supplier', 'b0000000-0000-0000-0000-000000000023', 'USD', '2030', 'Arabian Safety Payable Account')
ON CONFLICT DO NOTHING;

-- 5. Industrial Products
INSERT INTO catalog.products (id, sku, name, slug, description, brand_id, category_id, attributes, status)
VALUES 
    ('e0000000-0000-0000-0000-000000000021', 'MRO-BOSCH-GBH228', 
     '{"en": "Bosch Rotary Hammer Drill GBH 2-28 F Heavy Duty SDS-Plus", "ar": "دريل هلتي دوار بوش GBH 2-28 F للأعمال الشاقة"}',
     '{"en": "bosch-rotary-hammer-drill-gbh-2-28", "ar": "bosch-rotary-hammer-drill-gbh-2-28"}',
     '{"en": "Top performance with 880W motor and 3.2 Joules of impact energy. Features KickBack Control for maximum user safety.", "ar": "أعلى أداء بمحرك 880 واط وطاقة صدم 3.2 جول. مزود بخاصية التحكم بالارتداد لسلامة العامل."}',
     'd0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000010',
     '{"power_watts": "880W", "impact_energy_j": "3.2J", "chuck_type": "SDS-Plus", "voltage": "230V", "weight_kg": "3.1"}', 'approved'),

    ('e0000000-0000-0000-0000-000000000022', 'MRO-SCHN-MCCB100A',
     '{"en": "Schneider Compact NSX100F 3-Phase Circuit Breaker 100A 36kA", "ar": "قاطع تيار كهربائي ثلاثي الأطوار شنايدر NSX100F بقوة 100 أمبير 36 كيلو أمبير"}',
     '{"en": "schneider-circuit-breaker-nsx100f-100a", "ar": "schneider-circuit-breaker-nsx100f-100a"}',
     '{"en": "Industrial grade 3-pole molded case circuit breaker (MCCB) with TMD thermal-magnetic trip unit. Compliant with IEC 60947-2.", "ar": "قاطع صناعي 3 بول بقالب مصبوب مع وحدة فصل حرارية مغناطيسية TMD. مطابق لمعيار IEC 60947-2."}',
     'd0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000011',
     '{"current_rating": "100A", "poles": "3P", "breaking_capacity": "36kA", "standard": "IEC 60947-2"}', 'approved'),

    ('e0000000-0000-0000-0000-000000000023', 'MRO-3M-AURA9332',
     '{"en": "3M Aura Disposable Particulate Respirator 9332+ FFP3 (Box of 20)", "ar": "كمامة واقية من الجسيمات الدقيقة 3M أورا 9332+ تصنيف FFP3 (صندوق 20 حبة)"}',
     '{"en": "3m-aura-particulate-respirator-9332-ffp3", "ar": "3m-aura-particulate-respirator-9332-ffp3"}',
     '{"en": "Flat-fold 3-panel design with Cool Flow valve reduces heat build-up. Protects against hazardous dusts, mists, and metal fumes.", "ar": "تصميم ثلاثي الألواح قابل للطي مع صمام التدفق البارد Cool Flow. يحمي من الأتربة الخطرة وأبخرة المعادن."}',
     'd0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000012',
     '{"standard": "EN 149:2001+A1:2009 FFP3 NR D", "pack_quantity": "20", "valve_type": "3M Cool Flow"}', 'approved'),

    ('e0000000-0000-0000-0000-000000000024', 'MRO-MAKI-DGA504',
     '{"en": "Makita 18V Brushless Cordless 5-Inch Angle Grinder DGA504", "ar": "صاروخ قطعية وجلخ لاسلكي ماكيتا 18 فولت مقاس 5 بوصة DGA504"}',
     '{"en": "makita-18v-brushless-angle-grinder-dga504", "ar": "makita-18v-brushless-angle-grinder-dga504"}',
     '{"en": "Equipped with Automatic Torque Drive Technology (ADT). Features brushless motor delivering 8,500 RPM for heavy-duty metal grinding.", "ar": "مزود بتقنية عزم الدوران التلقائي ADT. محرك بدون شربون بقوة 8500 دورة/دقيقة لقطع وجلخ المعادن الثقيلة."}',
     'd0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000010',
     '{"battery_voltage": "18V LXT", "wheel_diameter": "125mm (5-inch)", "no_load_speed": "8500 RPM"}', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 6. Supplier Commercial Offers (Dual-Channel Wholesale Tiers + Retail Single Unit)
INSERT INTO catalog.supplier_offers (
    id, product_id, supplier_id, supplier_sku, currency, price, retail_price, moq,
    b2b_enabled, b2c_enabled, price_tiers, lead_time_days, status
)
VALUES 
    -- Bosch Drill Offer (Wholesale B2B with volume tiers, plus B2C retail)
    ('f0000000-0000-0000-0000-000000000021', 'e0000000-0000-0000-0000-000000000021',
     'b0000000-0000-0000-0000-000000000021', 'ATL-BOSCH-GBH228', 'USD', 24000, 28500, 5,
     TRUE, TRUE,
     '[{"minQty": 5, "maxQty": 19, "price": 24000}, {"minQty": 20, "maxQty": 49, "price": 22500}, {"minQty": 50, "maxQty": 9999, "price": 20500}]'::jsonb,
     2, 'active'),

    -- Schneider Breaker Offer
    ('f0000000-0000-0000-0000-000000000022', 'e0000000-0000-0000-0000-000000000022',
     'b0000000-0000-0000-0000-000000000022', 'GLF-SCHN-100A', 'USD', 18500, 21900, 2,
     TRUE, TRUE,
     '[{"minQty": 2, "maxQty": 9, "price": 18500}, {"minQty": 10, "maxQty": 29, "price": 17000}, {"minQty": 30, "maxQty": 9999, "price": 15200}]'::jsonb,
     3, 'active'),

    -- 3M Safety Respirator Offer
    ('f0000000-0000-0000-0000-000000000023', 'e0000000-0000-0000-0000-000000000023',
     'b0000000-0000-0000-0000-000000000023', 'ARB-3M-9332BOX', 'USD', 6500, 8500, 10,
     TRUE, TRUE,
     '[{"minQty": 10, "maxQty": 49, "price": 6500}, {"minQty": 50, "maxQty": 199, "price": 5800}, {"minQty": 200, "maxQty": 9999, "price": 4900}]'::jsonb,
     1, 'active'),

    -- Makita Angle Grinder Offer
    ('f0000000-0000-0000-0000-000000000024', 'e0000000-0000-0000-0000-000000000024',
     'b0000000-0000-0000-0000-000000000021', 'ATL-MAKI-DGA504', 'USD', 19500, 23500, 4,
     TRUE, TRUE,
     '[{"minQty": 4, "maxQty": 15, "price": 19500}, {"minQty": 16, "maxQty": 49, "price": 18000}, {"minQty": 50, "maxQty": 9999, "price": 16500}]'::jsonb,
     2, 'active')
ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    retail_price = EXCLUDED.retail_price,
    price_tiers = EXCLUDED.price_tiers,
    b2b_enabled = EXCLUDED.b2b_enabled,
    b2c_enabled = EXCLUDED.b2c_enabled;

-- 7. Warehouses & Physical Stock Inventory
INSERT INTO inventory.warehouses (id, organization_id, code, name, country_code, city, address_line, is_active)
VALUES 
    ('10000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000021', 'ATL-RUH-01', 'Atlas Central Logistics Hub', 'SA', 'Riyadh', '2nd Industrial City, Gate 8', TRUE),
    ('10000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000022', 'GLF-JED-01', 'Gulf Power Distribution Yard', 'SA', 'Jeddah', 'Modon Industrial Area, Phase 3', TRUE),
    ('10000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000023', 'ARB-DMM-01', 'Arabian Safety Eastern Warehouse', 'SA', 'Dammam', '1st Industrial City, Logistics Park', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory.warehouse_stock (warehouse_id, offer_id, on_hand, reserved, reorder_threshold)
VALUES 
    ('10000000-0000-0000-0000-000000000021', 'f0000000-0000-0000-0000-000000000021', 150, 0, 10),
    ('10000000-0000-0000-0000-000000000022', 'f0000000-0000-0000-0000-000000000022', 80, 0, 5),
    ('10000000-0000-0000-0000-000000000023', 'f0000000-0000-0000-0000-000000000023', 500, 0, 50),
    ('10000000-0000-0000-0000-000000000021', 'f0000000-0000-0000-0000-000000000024', 90, 0, 8)
ON CONFLICT (warehouse_id, offer_id) DO UPDATE SET
    on_hand = EXCLUDED.on_hand;

-- 8. Industrial Merchant Receiving Docks (Flatbed & Freight Ready)
INSERT INTO commerce.merchant_receiving_warehouses (
    id, organization_id, code, name, country_code, city, address_line, dock_type, has_forklift, receiving_hours, contact_name, contact_phone, is_default, is_active
)
VALUES 
    ('20000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000002', 'DOCK-RUH-02',
     'Riyadh Industrial City 2 Central Receiving Dock', 'SA', 'Riyadh', 'Street 88, Gate 4',
     'raised_dock', TRUE, '07:00 - 16:00', 'Eng. Tariq Al-Otaibi', '+966501234567', TRUE, TRUE),

    ('20000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000002', 'DOCK-JED-BAYC',
     'Jeddah Logistics Yard Bay C', 'SA', 'Jeddah', 'Al-Khomrah Freight Corridor',
     'ground_level', TRUE, '08:00 - 18:00', 'Sami Mansour', '+966559876543', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;
