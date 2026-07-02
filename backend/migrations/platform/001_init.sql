-- ChainProof Platform (Universal) Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Subscription plans
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_sites INT NOT NULL DEFAULT 1,
    max_endpoints INT NOT NULL DEFAULT 10,
    max_anchors_monthly INT NOT NULL DEFAULT 1000,
    features JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans (name, slug, price_monthly, max_sites, max_endpoints, max_anchors_monthly, features) VALUES
('Free', 'free', 0, 1, 5, 500, '["Basic tamper detection", "Email alerts", "1 site"]'),
('Pro', 'pro', 49.00, 10, 100, 50000, '["Unlimited alerts", "API access", "Forensic reports", "10 sites"]'),
('Enterprise', 'enterprise', 199.00, -1, -1, -1, '["Dedicated support", "Custom SLA", "SSO", "Unlimited everything"]')
ON CONFLICT (slug) DO NOTHING;

-- Organizations (tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    db_name VARCHAR(100) NOT NULL UNIQUE,
    plan_id UUID REFERENCES plans(id),
    subscription_status VARCHAR(30) NOT NULL DEFAULT 'active',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'none',
    stripe_customer_id VARCHAR(255),
    settings JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Platform users (owners, super admins)
CREATE TABLE IF NOT EXISTS platform_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'owner',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_platform_role CHECK (role IN ('super_admin', 'owner', 'billing_admin'))
);

CREATE INDEX idx_platform_users_org ON platform_users(organization_id);
CREATE INDEX idx_platform_users_email ON platform_users(email);

-- Platform audit log (super admin actions)
CREATE TABLE IF NOT EXISTS platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES platform_users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage metering
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric VARCHAR(50) NOT NULL,
    value BIGINT NOT NULL DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, metric, period_start)
);

CREATE INDEX idx_usage_org_period ON usage_records(organization_id, period_start);
