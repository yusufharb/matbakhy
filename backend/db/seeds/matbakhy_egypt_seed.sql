-- ==============================================================================
-- MATBAKHY — Egyptian Home-Cooked Food Marketplace Seed Dataset
-- ==============================================================================

-- 1. Egyptian Food Categories
INSERT INTO catalog.categories (id, name, slug, path, depth)
VALUES 
    ('c1000000-0000-0000-0000-000000000001', '{"ar": "محاشي وطواجن فرن", "en": "Mahshi & Oven Tagines"}', '{"ar": "mahshi-tagines", "en": "mahshi-tagines"}', '01', 0),
    ('c1000000-0000-0000-0000-000000000002', '{"ar": "صواني ومكرونات بيتي", "en": "Oven Trays & Homemade Pastas"}', '{"ar": "trays-pastas", "en": "trays-pastas"}', '02', 0),
    ('c1000000-0000-0000-0000-000000000003', '{"ar": "وجبات لحوم ودواجن بلدي", "en": "Baladi Meat & Poultry Meals"}', '{"ar": "meat-poultry", "en": "meat-poultry"}', '03', 0),
    ('c1000000-0000-0000-0000-000000000004', '{"ar": "كشري وأطباق شعبية", "en": "Koshary & Traditional Dishes"}', '{"ar": "koshary-street-food", "en": "koshary-street-food"}', '04', 0),
    ('c1000000-0000-0000-0000-000000000005', '{"ar": "حلويات ومخبوزات منزلية", "en": "Homemade Sweets & Bakery"}', '{"ar": "sweets-bakery", "en": "sweets-bakery"}', '05', 0)
ON CONFLICT (id) DO NOTHING;

-- 2. Certified Home Kitchen Organizations
INSERT INTO iam.organizations (id, type, name, legal_name, country_code, status, metadata)
VALUES 
    ('b1000000-0000-0000-0000-000000000001', 'supplier', 
     '{"ar": "مطبخ أم أحمد للأكلات المصرية", "en": "Um Ahmed Authentic Egyptian Kitchen"}', 
     'مطبخ أم أحمد المنزلي', 'EG', 'approved', 
     '{"district": "Maadi", "governorate": "Cairo", "specialty": "محاشي وطواجن بلدي"}'),

    ('b1000000-0000-0000-0000-000000000002', 'supplier', 
     '{"ar": "مطبخ الست فاطمة للصواني والعزومات", "en": "Fatma Homemade Trays & Feasts"}', 
     'مطبخ الست فاطمة للوجبات المنزلية', 'EG', 'approved', 
     '{"district": "5th Settlement", "governorate": "Cairo", "specialty": "صواني بشاميل وعزومات"}'),

    ('b1000000-0000-0000-0000-000000000003', 'supplier', 
     '{"ar": "بيت الشيف مريم للحلويات الشرقية", "en": "Chef Maryam Sweets & Bakery"}', 
     'بيت مريم للمخبوزات المنزلية', 'EG', 'approved', 
     '{"district": "Sheikh Zayed", "governorate": "Giza", "specialty": "كنافة وأم علي ومخبوزات"}'),

    ('b1000000-0000-0000-0000-000000000004', 'supplier', 
     '{"ar": "مطبخ أم عمر للأطباق السريعة والبلدي", "en": "Um Omar Quick & Baladi Food"}', 
     'مطبخ أم عمر المنزلي', 'EG', 'approved', 
     '{"district": "Nasr City", "governorate": "Cairo", "specialty": "كشري بيتي وحواوشي بلدي"}')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_code = EXCLUDED.country_code,
    status = EXCLUDED.status;

-- 3. Kitchen Profiles
INSERT INTO kitchen.kitchen_profiles (
    id, organization_id, chef_name, bio, governorate, district, address_line, 
    latitude, longitude, delivery_radius_km, is_open, hygiene_rating, hygiene_badge
) VALUES 
    ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 
     'الحاجة أم أحمد', 
     'أكل بيتي على أصوله بطعم زمان وسمنة بلدي ونظافة 100%. خبرة 25 سنة في طواجن الفرن والمحاشي المشكلة.', 
     'Cairo', 'المعادي / Maadi', 'شارع النصر، دجلة المعادي', 
     29.9602, 31.2844, 12, TRUE, 4.95, 'مطبخ معتمد ومرخص'),

    ('a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 
     'الست فاطمة', 
     'متخصصة في صواني البشاميل الفاخرة، طواجن الحمام بالفريك، ومحشي ورق عنب بدبس الرمان للعائلات والعزومات.', 
     'Cairo', 'التجمع الخامس / New Cairo', 'الحي الأول، قرب مجمع المحاكم', 
     30.0074, 31.4287, 15, TRUE, 4.90, 'مطبخ معتمد ومرخص'),

    ('a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 
     'الشيف مريم الصاوي', 
     'حلويات شرقية ومخبوزات منزلية طازجة بسمنة بلدي وقشطة فلاحي بدون أي مواد حافظة أو نكهات صناعية.', 
     'Giza', 'الشيخ زايد / Sheikh Zayed', 'الحي التاسع، المجاورة الأولى', 
     30.0435, 30.9833, 15, TRUE, 4.98, 'شيف معتمد متميز'),

    ('a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 
     'أم عمر', 
     'كشري بيتي على أصوله بصلصلة ودقة سرية، وحواوشي بلدي سخن ومقرمش جاهز للطلب الفوري في أي وقت.', 
     'Cairo', 'مدينة نصر / Nasr City', 'شارع مكرم عبيد، خلف السراج مول', 
     30.0631, 31.3452, 10, TRUE, 4.85, 'مطبخ معتمد ومرخص')
ON CONFLICT (organization_id) DO UPDATE SET
    chef_name = EXCLUDED.chef_name,
    bio = EXCLUDED.bio,
    district = EXCLUDED.district,
    is_open = EXCLUDED.is_open;

-- 4. Kitchen Operating Hours (All Open Daily 11:00 AM to 10:00 PM)
INSERT INTO kitchen.operating_hours (kitchen_id, day_of_week, open_time, close_time, is_closed)
SELECT k.id, d.day, '11:00:00'::time, '22:00:00'::time, FALSE
FROM kitchen.kitchen_profiles k
CROSS JOIN (SELECT generate_series(0, 6) as day) d
ON CONFLICT (kitchen_id, day_of_week) DO NOTHING;

-- 5. Kitchen Ledger Accounts (EGP Currency)
INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
VALUES 
    (gen_random_uuid(), 'supplier', 'b1000000-0000-0000-0000-000000000001', 'EGP', '2020', 'أم أحمد - حساب الضمان معلق'),
    (gen_random_uuid(), 'supplier', 'b1000000-0000-0000-0000-000000000001', 'EGP', '2030', 'أم أحمد - رصيد الأرباح المتاح للسحب'),
    (gen_random_uuid(), 'supplier', 'b1000000-0000-0000-0000-000000000002', 'EGP', '2020', 'الست فاطمة - حساب الضمان معلق'),
    (gen_random_uuid(), 'supplier', 'b1000000-0000-0000-0000-000000000002', 'EGP', '2030', 'الست فاطمة - رصيد الأرباح المتاح للسحب'),
    (gen_random_uuid(), 'supplier', 'b1000000-0000-0000-0000-000000000003', 'EGP', '2020', 'الشيف مريم - حساب الضمان معلق'),
    (gen_random_uuid(), 'supplier', 'b1000000-0000-0000-0000-000000000003', 'EGP', '2030', 'الشيف مريم - رصيد الأرباح المتاح للسحب'),
    (gen_random_uuid(), 'supplier', 'b1000000-0000-0000-0000-000000000004', 'EGP', '2020', 'أم عمر - حساب الضمان معلق'),
    (gen_random_uuid(), 'supplier', 'b1000000-0000-0000-0000-000000000004', 'EGP', '2030', 'أم عمر - رصيد الأرباح المتاح للسحب')
ON CONFLICT DO NOTHING;

-- 6. Canonical Dishes (catalog.products)
INSERT INTO catalog.products (
    id, sku, name, slug, description, category_id, attributes, dietary_tags, status
) VALUES 
    ('d1000000-0000-0000-0000-000000000001', 'DISH-WARAK-ENAB', 
     '{"ar": "محشي ورق عنب بلدي بدبس الرمان واللحمة المفرومة", "en": "Vine Leaves with Minced Meat & Pomegranate"}',
     '{"ar": "mahshi-warak-enab", "en": "mahshi-warak-enab"}',
     '{"ar": "ورق عنب بناتي طازج محشي بالأرز المصري واللحمة المفرومة ومطبوخ بزيت زيتون بكر ودبس رمان حامض حلو.", "en": "Fresh tender vine leaves stuffed with Egyptian rice, spiced minced meat, cooked in olive oil & pomegranate molasses."}',
     'c1000000-0000-0000-0000-000000000001',
     '{"cuisine": "Egyptian Traditional", "packaging": "Thermal Foil Box", "prep_type": "Slow Cooked"}',
     '["egyptian_traditional", "halal", "contains_meat"]', 'approved'),

    ('d1000000-0000-0000-0000-000000000002', 'DISH-BECHAMEL-TRAY', 
     '{"ar": "صينية مكرونة فرن بالبشاميل البلدي باللحمة المعصجة", "en": "Oven Baked Bechamel Pasta with Minced Beef"}',
     '{"ar": "macaroni-bechamel", "en": "macaroni-bechamel"}',
     '{"ar": "طبقات من المكرونة القلم مغطاة بصوص البشاميل الكريمي الغني بالسمنة البلدي وحشوة اللحمة المفرومة المتبلة ومحمرة ذهبية.", "en": "Penne layered with spiced minced beef and rich homemade creamy bechamel sauce baked to golden perfection."}',
     'c1000000-0000-0000-0000-000000000002',
     '{"cuisine": "Egyptian", "servings": "1-6 Persons", "dairy": "Fresh Milk & Butter"}',
     '["comfort_food", "halal", "contains_dairy", "contains_gluten"]', 'approved'),

    ('d1000000-0000-0000-0000-000000000003', 'DISH-MOLOKHIA-CHICKEN', 
     '{"ar": "ملوخية مصرية بالطشة مع نصف دجاجة محمرة وأرز بالشعرية", "en": "Egyptian Molokhia with Half Roasted Chicken & Rice"}',
     '{"ar": "molokhia-chicken-meal", "en": "molokhia-chicken-meal"}',
     '{"ar": "ملوخية خضراء فريش مخروطة على اليد بطشة الثوم والكزبرة الجافة، تقدم مع نصف دجاجة محمرة بالسمنة وأرز مصري بالشعرية.", "en": "Fresh hand-minced green molokhia with sizzling garlic coriander tasha, half golden chicken, and vermicelli rice."}',
     'c1000000-0000-0000-0000-000000000003',
     '{"cuisine": "Classic Egyptian", "poultry": "Fresh Baladi Chicken"}',
     '["egyptian_traditional", "halal", "ready_fast"]', 'approved'),

    ('d1000000-0000-0000-0000-000000000004', 'DISH-KOSHARY-SPECIAL', 
     '{"ar": "كشري مصري بيتي كامل الدقة والصلصة والبصل المقرمش", "en": "Homemade Egyptian Koshary with Fried Onions & Dakkah"}',
     '{"ar": "koshary-homemade", "en": "koshary-homemade"}',
     '{"ar": "أرز مصري بعدس بجودة عالية، مكرونة مشكلة، حمص شام مسلوق، صلصة طماطم مسبكة، دقة ثوم وخل، وشطة زيت حارة.", "en": "Authentic layered rice and brown lentils, macaroni, boiled chickpeas, savory tomato sauce, garlic vinegar dakkah, and crispy onions."}',
     'c1000000-0000-0000-0000-000000000004',
     '{"cuisine": "Egyptian Vegan Classic", "heat": "Customizable Chili"}',
     '["vegan", "halal", "comfort_food", "ready_fast"]', 'approved'),

    ('d1000000-0000-0000-0000-000000000005', 'DISH-HAWAWSHI-BALADI', 
     '{"ar": "حواوشي إسكندراني بلدي باللحمة المتبلة (رغيفين)", "en": "Baladi Hawawshi in Egyptian Bread (2 Loaves)"}',
     '{"ar": "hawawshi-baladi", "en": "hawawshi-baladi"}',
     '{"ar": "رغيفان من العيش البلدي الردة محشوان باللحمة المفرومة الطازجة بالبصل والفلفل الأخضر والبهارات ومسويين على الجريل بالسمنة.", "en": "Fresh minced beef with onions, green peppers, and aromatic spices stuffed in 2 Egyptian baladi flatbreads and crisp-grilled."}',
     'c1000000-0000-0000-0000-000000000004',
     '{"spice_level": "Medium", "prep_time": "30 mins"}',
     '["street_food", "halal", "ready_fast"]', 'approved'),

    ('d1000000-0000-0000-0000-000000000006', 'DISH-KUNAFA-CREAM', 
     '{"ar": "صينية كنافة بالقشطة الفلاحي والفسدق الحلبي", "en": "Golden Kunafa with Fresh Clotted Cream & Pistachios"}',
     '{"ar": "kunafa-cream", "en": "kunafa-cream"}',
     '{"ar": "شعر كنافة مقرمش ذهبي بالسمنة البلدي محشو بقشطة فلاحي طازجة ومسقي بالشربات المعقود ومزين بالفسدق.", "en": "Crisp golden shredded phyllo pastry soaked in sweet syrup, stuffed with rich fresh clotted cream, topped with pistachios."}',
     'c1000000-0000-0000-0000-000000000005',
     '{"sweetness": "Balanced", "serving": "Warm or Chilled"}',
     '["dessert", "halal", "contains_dairy", "contains_nuts"]', 'approved'),

    ('d1000000-0000-0000-0000-000000000007', 'DISH-OM-ALI-NUTS', 
     '{"ar": "طاجن أم علي بالمكسرات والقشطة الفلاحي واللبن الطبيعي", "en": "Traditional Om Ali with Mixed Nuts & Cream"}',
     '{"ar": "om-ali-nuts", "en": "om-ali-nuts"}',
     '{"ar": "رقائق ميلفيه هشة مخبوزة في طاجن فخار مع الحليب الطبيعي الساخن والمكسرات (بندق، لوز، زبيب، جوز هند) ومغطاة بالقشطة.", "en": "Puff pastry baked in clay pot with sweetened hot milk, raisins, almonds, hazelnuts, coconut, and broiled fresh cream top."}',
     'c1000000-0000-0000-0000-000000000005',
     '{"serving": "Served Steaming Hot"}',
     '["dessert", "comfort_food", "contains_dairy", "contains_nuts"]', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 7. Kitchen Commercial Food Offers (Menu Listings with EGP minor units)
INSERT INTO catalog.supplier_offers (
    id, product_id, supplier_id, supplier_sku, currency, price, retail_price, moq,
    prep_lead_hours, is_instant, is_scheduled, daily_portion_limit, portions, status
) VALUES 
    -- 1. Um Ahmed - Mahshi Warak Enab (150 EGP Single, 280 EGP Kilo)
    ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 
     'b1000000-0000-0000-0000-000000000001', 'UAH-WARAK-ENAB', 'EGP', 15000, 15000, 1,
     3, FALSE, TRUE, 15, 
     '[{"id": "portion-half", "name": {"ar": "طبق نصف كيلو (شخصين)", "en": "Half Kilo (2 Persons)"}, "price_cents": 15000, "is_default": true}, {"id": "portion-kilo", "name": {"ar": "سيرفيس كيلو كامل (4 أفراد)", "en": "Full Kilo (4 Persons)"}, "price_cents": 28000, "is_default": false}]'::jsonb,
     'active'),

    -- 2. Fatma - Bechamel Tray (180 EGP Medium, 340 EGP Family)
    ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 
     'b1000000-0000-0000-0000-000000000002', 'FAT-BECHAMEL-01', 'EGP', 18000, 18000, 1,
     4, FALSE, TRUE, 10,
     '[{"id": "portion-med", "name": {"ar": "صينية وسط (شخصين - 3 أشخاص)", "en": "Medium Tray (2-3 Persons)"}, "price_cents": 18000, "is_default": true}, {"id": "portion-fam", "name": {"ar": "صينية عائلية كبرى (5 - 6 أفراد)", "en": "Large Family Tray (5-6 Persons)"}, "price_cents": 34000, "is_default": false}]'::jsonb,
     'active'),

    -- 3. Um Ahmed - Molokhia & Chicken (160 EGP Meal)
    ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 
     'b1000000-0000-0000-0000-000000000001', 'UAH-MOLOKHIA-CHK', 'EGP', 16000, 16000, 1,
     1, TRUE, TRUE, 20,
     '[{"id": "portion-single", "name": {"ar": "وجبة فردية (نصف دجاجة + ملوخية + أرز)", "en": "Single Meal (Half Chicken + Molokhia + Rice)"}, "price_cents": 16000, "is_default": true}]'::jsonb,
     'active'),

    -- 4. Um Omar - Koshary Special (65 EGP Plate)
    ('f1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 
     'b1000000-0000-0000-0000-000000000004', 'UOM-KOSHARY-01', 'EGP', 6500, 6500, 1,
     1, TRUE, TRUE, 30,
     '[{"id": "portion-reg", "name": {"ar": "علبة كشري وسط سوبر", "en": "Medium Super Box"}, "price_cents": 6500, "is_default": true}, {"id": "portion-xl", "name": {"ar": "علبة كشري جامبو عائلي", "en": "Jumbo Family Box"}, "price_cents": 9500, "is_default": false}]'::jsonb,
     'active'),

    -- 5. Um Omar - Baladi Hawawshi (110 EGP for 2 Loaves)
    ('f1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 
     'b1000000-0000-0000-0000-000000000004', 'UOM-HAWAWSHI-01', 'EGP', 11000, 11000, 1,
     1, TRUE, TRUE, 25,
     '[{"id": "portion-2loaves", "name": {"ar": "طلب رغيفين حواوشي بلدي مع مخلل وطحينة", "en": "2 Loaves Baladi Hawawshi with Pickles & Tahini"}, "price_cents": 11000, "is_default": true}]'::jsonb,
     'active'),

    -- 6. Chef Maryam - Kunafa with Cream (190 EGP Tray)
    ('f1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000003', 
     'b1000000-0000-0000-0000-000000000003', 'MAR-KUNAFA-01', 'EGP', 19000, 19000, 1,
     2, TRUE, TRUE, 15,
     '[{"id": "portion-med-kunafa", "name": {"ar": "صينية وسط مقاس 26 (4 - 6 أفراد)", "en": "Medium Tray Size 26 (4-6 Persons)"}, "price_cents": 19000, "is_default": true}]'::jsonb,
     'active'),

    -- 7. Chef Maryam - Om Ali Clay Pot (95 EGP Pot)
    ('f1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000007', 
     'b1000000-0000-0000-0000-000000000003', 'MAR-OMALI-01', 'EGP', 9500, 9500, 1,
     1, TRUE, TRUE, 20,
     '[{"id": "portion-pot", "name": {"ar": "طاجن فخار فردين غني بالقشطة والمكسرات", "en": "Clay Pot for 2 Persons with Nuts & Cream"}, "price_cents": 9500, "is_default": true}]'::jsonb,
     'active')
ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    retail_price = EXCLUDED.retail_price,
    currency = EXCLUDED.currency,
    portions = EXCLUDED.portions,
    prep_lead_hours = EXCLUDED.prep_lead_hours,
    is_instant = EXCLUDED.is_instant,
    is_scheduled = EXCLUDED.is_scheduled;

-- 8. Platform Commission Rules for Food (12.5% Standard Take Rate)
INSERT INTO platform.commission_rules (name, scope_type, rate_percent, priority, is_active)
VALUES ('Matbakhy Food Category Commission', 'global', 12.50, 10, TRUE)
ON CONFLICT DO NOTHING;

-- 9. Initial Capacity Slots for Today and Tomorrow
INSERT INTO kitchen.capacity_slots (offer_id, slot_date, daily_limit, reserved_count, sold_count)
SELECT o.id, CURRENT_DATE, o.daily_portion_limit, 0, 0
FROM catalog.supplier_offers o
ON CONFLICT (offer_id, slot_date) DO NOTHING;

INSERT INTO kitchen.capacity_slots (offer_id, slot_date, daily_limit, reserved_count, sold_count)
SELECT o.id, CURRENT_DATE + INTERVAL '1 day', o.daily_portion_limit, 0, 0
FROM catalog.supplier_offers o
ON CONFLICT (offer_id, slot_date) DO NOTHING;
