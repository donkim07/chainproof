-- Per-Tenant Database Schema (applied when org is provisioned)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description, is_system) VALUES
('admin', 'Full access to all tenant resources', true),
('developer', 'API access, site management, view incidents', true),
('viewer', 'Read-only access to dashboard and reports', true),
('security_analyst', 'View and investigate tampering incidents', true)
ON CONFLICT (name) DO NOTHING;

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general'
);

INSERT INTO permissions (code, description, category) VALUES
('sites:read', 'View registered sites', 'sites'),
('sites:write', 'Create and update sites', 'sites'),
('sites:delete', 'Delete sites', 'sites'),
('endpoints:read', 'View protected endpoints', 'endpoints'),
('endpoints:write', 'Configure endpoint protection', 'endpoints'),
('integrity:anchor', 'Anchor records via API', 'integrity'),
('integrity:verify', 'Verify record integrity', 'integrity'),
('tampering:read', 'View tampering incidents', 'tampering'),
('tampering:investigate', 'Run forensic investigations', 'tampering'),
('team:read', 'View team members', 'team'),
('team:write', 'Invite and manage team', 'team'),
('api_keys:read', 'View API keys', 'api'),
('api_keys:write', 'Create and revoke API keys', 'api'),
('settings:read', 'View tenant settings', 'settings'),
('settings:write', 'Update tenant settings', 'settings'),
('notifications:read', 'View notification settings', 'notifications'),
('notifications:write', 'Configure alerts', 'notifications')
ON CONFLICT (code) DO NOTHING;

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Grant all permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Grant developer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'developer' AND p.code IN (
    'sites:read','sites:write','endpoints:read','endpoints:write',
    'integrity:anchor','integrity:verify','tampering:read','api_keys:read','api_keys:write'
)
ON CONFLICT DO NOTHING;

-- Tenant users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- API Keys for developer integration
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(12) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registered sites (websites/apps to protect)
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    integration_mode VARCHAR(30) NOT NULL DEFAULT 'api',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    db_type VARCHAR(30),
    db_connection_encrypted TEXT,
    settings JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_integration_mode CHECK (integration_mode IN ('api', 'proxy', 'webhook'))
);

CREATE INDEX idx_sites_status ON sites(status);

-- Protected endpoints
CREATE TABLE IF NOT EXISTS protected_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    method VARCHAR(10) NOT NULL,
    path_pattern VARCHAR(500) NOT NULL,
    table_name VARCHAR(100),
    record_id_field VARCHAR(100) DEFAULT 'id',
    enabled BOOLEAN NOT NULL DEFAULT true,
    auto_discovered BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(site_id, method, path_pattern)
);

CREATE INDEX idx_endpoints_site ON protected_endpoints(site_id);

-- Integrity records (hashes anchored to blockchain)
CREATE TABLE IF NOT EXISTS integrity_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    payload_hash VARCHAR(64) NOT NULL,
    record_hash VARCHAR(64) NOT NULL,
    previous_record_hash VARCHAR(64),
    blockchain_tx_id VARCHAR(255),
    blockchain_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    metadata JSONB NOT NULL DEFAULT '{}',
    anchored_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, record_hash)
);

CREATE INDEX idx_integrity_entity ON integrity_records(entity_type, entity_id);
CREATE INDEX idx_integrity_status ON integrity_records(blockchain_status);

-- Tampering incidents
CREATE TABLE IF NOT EXISTS tamper_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integrity_record_id UUID REFERENCES integrity_records(id),
    site_id UUID REFERENCES sites(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    severity VARCHAR(20) NOT NULL DEFAULT 'high',
    expected_hash VARCHAR(64) NOT NULL,
    actual_hash VARCHAR(64),
    blockchain_tx_id VARCHAR(255),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ,
    investigation_status VARCHAR(30) NOT NULL DEFAULT 'open',
    attribution JSONB,
    notes TEXT,
    notified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tamper_detected ON tamper_incidents(detected_at DESC);
CREATE INDEX idx_tamper_status ON tamper_incidents(investigation_status);

-- Notification settings
CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(30) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    events TEXT[] NOT NULL DEFAULT '{tamper_detected}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification log
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES notification_channels(id),
    incident_id UUID REFERENCES tamper_incidents(id),
    status VARCHAR(30) NOT NULL,
    payload JSONB,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
