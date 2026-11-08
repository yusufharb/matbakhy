-- Migration 000016: Matbakhy Home Kitchens, Scheduling & Capacity Engine (Egypt)

CREATE SCHEMA IF NOT EXISTS kitchen;

-- 1. Kitchen Profiles (Home cooks & Housewives culinary profiles)
CREATE TABLE IF NOT EXISTS kitchen.kitchen_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES iam.organizations(id) ON DELETE CASCADE,
    chef_name TEXT NOT NULL,
    bio TEXT,
    governorate TEXT NOT NULL DEFAULT 'Cairo',
    district TEXT NOT NULL,
    address_line TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    delivery_radius_km INT NOT NULL DEFAULT 12,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    hygiene_rating NUMERIC(3, 2) DEFAULT 4.90,
    hygiene_badge TEXT DEFAULT 'certified_home_kitchen',
    national_id_url TEXT,
    freelance_permit_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kitchen_profiles_org ON kitchen.kitchen_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_profiles_location ON kitchen.kitchen_profiles(governorate, district);

-- 2. Kitchen Operating Hours
CREATE TABLE IF NOT EXISTS kitchen.operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kitchen_id UUID NOT NULL REFERENCES kitchen.kitchen_profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
    open_time TIME NOT NULL DEFAULT '10:00:00',
    close_time TIME NOT NULL DEFAULT '22:00:00',
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(kitchen_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_kitchen_hours_kitchen ON kitchen.operating_hours(kitchen_id);

-- 3. Extend Catalog Products with Food Details
ALTER TABLE catalog.products
    ADD COLUMN IF NOT EXISTS dietary_tags JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS reheating_instructions TEXT;

-- 4. Extend Catalog Supplier Offers for Food Menus, Prep Hours & Portion Pricing
ALTER TABLE catalog.supplier_offers
    ADD COLUMN IF NOT EXISTS prep_lead_hours INT NOT NULL DEFAULT 2,
    ADD COLUMN IF NOT EXISTS is_instant BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS daily_portion_limit INT NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS portions JSONB DEFAULT '[]';

-- 5. Extend Commerce Suborders for Matbakhy Kitchen Scheduling & Delivery
ALTER TABLE commerce.suborders
    ADD COLUMN IF NOT EXISTS order_mode TEXT NOT NULL DEFAULT 'scheduled' CHECK (order_mode IN ('instant', 'scheduled')),
    ADD COLUMN IF NOT EXISTS scheduled_date DATE,
    ADD COLUMN IF NOT EXISTS slot_start_time TIME,
    ADD COLUMN IF NOT EXISTS slot_end_time TIME,
    ADD COLUMN IF NOT EXISTS prep_status TEXT NOT NULL DEFAULT 'new' CHECK (prep_status IN ('new', 'accepted', 'cooking', 'ready_for_pickup', 'dispatched', 'rejected')),
    ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'platform_delivery' CHECK (fulfillment_type IN ('platform_delivery', 'cook_delivery', 'customer_pickup')),
    ADD COLUMN IF NOT EXISTS delivery_fee BIGINT NOT NULL DEFAULT 2500, -- in minor units (e.g. 25.00 EGP)
    ADD COLUMN IF NOT EXISTS cook_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_suborders_date ON commerce.suborders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_suborders_prep_status ON commerce.suborders(prep_status);
CREATE INDEX IF NOT EXISTS idx_suborders_kitchen_date ON commerce.suborders(supplier_id, scheduled_date);

-- 6. Kitchen Capacity & Portion Slots (Prevents Overbooking Home Kitchens)
CREATE TABLE IF NOT EXISTS kitchen.capacity_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES catalog.supplier_offers(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    daily_limit INT NOT NULL DEFAULT 20,
    reserved_count INT NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
    sold_count INT NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(offer_id, slot_date),
    CONSTRAINT chk_capacity_limit CHECK (reserved_count + sold_count <= daily_limit)
);

CREATE INDEX IF NOT EXISTS idx_capacity_slots_offer_date ON kitchen.capacity_slots(offer_id, slot_date);
