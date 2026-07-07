-- Platform feature flags and scanner wordlists
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (key, value) VALUES
('feature_flags', '{"api_discovery": true, "blockchain_anchors": true, "team_rbac": true, "billing_v2": false}'::jsonb),
('scanner_config', '{"default_rate_limit": 20, "max_endpoints_per_scan": 200, "scan_depth": "normal"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS scanner_wordlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    path TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    line_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
