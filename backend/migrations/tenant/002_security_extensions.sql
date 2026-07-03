-- Security and observability extensions for BAAS phase 2

CREATE TABLE IF NOT EXISTS proxy_capture_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    query_string TEXT,
    status_code INT,
    request_headers JSONB NOT NULL DEFAULT '{}',
    request_body TEXT,
    response_headers JSONB NOT NULL DEFAULT '{}',
    response_body TEXT,
    ip_address INET,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proxy_logs_site_time ON proxy_capture_logs(site_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS db_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(255),
    operation VARCHAR(20) NOT NULL,
    db_user VARCHAR(255),
    client_ip VARCHAR(128),
    hostname VARCHAR(255),
    application VARCHAR(255),
    sql_statement TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_db_change_log_record ON db_change_log(table_name, record_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS incident_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES tamper_incidents(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES notification_channels(id) ON DELETE CASCADE,
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'queued',
    response_body TEXT,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
