-- Migration 000016 Down: Revert Matbakhy Home Kitchens, Scheduling & Capacity Engine

DROP TABLE IF EXISTS kitchen.capacity_slots;

ALTER TABLE commerce.suborders
    DROP COLUMN IF EXISTS cook_notes,
    DROP COLUMN IF EXISTS delivery_fee,
    DROP COLUMN IF EXISTS fulfillment_type,
    DROP COLUMN IF EXISTS prep_status,
    DROP COLUMN IF EXISTS slot_end_time,
    DROP COLUMN IF EXISTS slot_start_time,
    DROP COLUMN IF EXISTS scheduled_date,
    DROP COLUMN IF EXISTS order_mode;

ALTER TABLE catalog.supplier_offers
    DROP COLUMN IF EXISTS portions,
    DROP COLUMN IF EXISTS daily_portion_limit,
    DROP COLUMN IF EXISTS is_scheduled,
    DROP COLUMN IF EXISTS is_instant,
    DROP COLUMN IF EXISTS prep_lead_hours;

ALTER TABLE catalog.products
    DROP COLUMN IF EXISTS reheating_instructions,
    DROP COLUMN IF EXISTS ingredients,
    DROP COLUMN IF EXISTS dietary_tags;

DROP TABLE IF EXISTS kitchen.operating_hours;
DROP TABLE IF EXISTS kitchen.kitchen_profiles;
DROP SCHEMA IF EXISTS kitchen CASCADE;
