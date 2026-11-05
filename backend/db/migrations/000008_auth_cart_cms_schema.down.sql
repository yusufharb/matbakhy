-- Migration 000008 Rollback: Drop Auth Sessions, Cart Persistence, CMS Sections, Notifications
DROP TABLE IF EXISTS platform.notifications CASCADE;
DROP TABLE IF EXISTS platform.cms_sections CASCADE;
DROP TABLE IF EXISTS commerce.cart_items CASCADE;
DROP TABLE IF EXISTS commerce.cart_sessions CASCADE;
DROP TABLE IF EXISTS iam.otp_codes CASCADE;
DROP TABLE IF EXISTS iam.auth_sessions CASCADE;
