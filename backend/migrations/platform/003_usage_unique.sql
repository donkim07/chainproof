CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_org_metric_period
  ON usage_records(organization_id, metric, period_start);
