-- Migration 000008: Auth Sessions, Cart Persistence, CMS Sections, Notifications
CREATE SCHEMA IF NOT EXISTS platform;

-- Auth Sessions (Bearer Tokens / Session Management)
CREATE TABLE IF NOT EXISTS iam.auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP Codes for 2FA and Payout Verifications
CREATE TABLE IF NOT EXISTS iam.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('login_2fa', 'payout_confirm', 'email_verify', 'password_reset')),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Server-Side Cart Persistence
CREATE TABLE IF NOT EXISTS commerce.cart_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES iam.users(id) ON DELETE CASCADE,
    session_key TEXT UNIQUE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cart Items
CREATE TABLE IF NOT EXISTS commerce.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES commerce.cart_sessions(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES catalog.supplier_offers(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cart_id, offer_id)
);

-- Persistent CMS Sections
CREATE TABLE IF NOT EXISTS platform.cms_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    section_type TEXT NOT NULL, -- 'hero_carousel', 'category_grid', 'featured_products', 'supplier_spotlight'
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    content_en JSONB NOT NULL DEFAULT '{}',
    content_ar JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Notifications
CREATE TABLE IF NOT EXISTS platform.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    title JSONB NOT NULL,
    message JSONB NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('order', 'kyc', 'payout', 'dispute', 'system')),
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON iam.auth_sessions(token_hash) WHERE revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON platform.notifications(user_id, is_read);
