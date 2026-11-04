-- Migration 000001: IAM Schema (Users, Organizations, RBAC)
CREATE SCHEMA IF NOT EXISTS iam;

-- Users Table
CREATE TABLE IF NOT EXISTS iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
    locale TEXT NOT NULL DEFAULT 'en',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organizations (Suppliers, Platform, Merchants)
CREATE TABLE IF NOT EXISTS iam.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('platform', 'supplier', 'merchant')),
    name JSONB NOT NULL, -- {"en": "...", "ar": "..."}
    legal_name TEXT,
    tax_id TEXT,
    commercial_reg_no TEXT,
    country_code TEXT NOT NULL DEFAULT 'SA',
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization Memberships (User <-> Org with Role)
CREATE TABLE IF NOT EXISTS iam.org_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES iam.organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- Roles
CREATE TABLE IF NOT EXISTS iam.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('platform', 'supplier', 'merchant')),
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissions
CREATE TABLE IF NOT EXISTS iam.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    UNIQUE(resource, action)
);

-- Role Permissions Join
CREATE TABLE IF NOT EXISTS iam.role_permissions (
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON iam.users(email);
CREATE INDEX IF NOT EXISTS idx_orgs_status ON iam.organizations(status);
