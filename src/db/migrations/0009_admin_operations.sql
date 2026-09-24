BEGIN;

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id UUID
    REFERENCES users(id)
    ON DELETE SET NULL,

  action VARCHAR(100) NOT NULL,

  resource_type VARCHAR(100),

  resource_id UUID,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  ip_address INET,

  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor
  ON audit_logs(actor_user_id);

CREATE INDEX idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id);

CREATE INDEX idx_audit_logs_action
  ON audit_logs(action);

CREATE INDEX idx_audit_logs_created
  ON audit_logs(created_at DESC);


CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  setting_key VARCHAR(150) NOT NULL UNIQUE,

  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,

  description TEXT,

  updated_by_user_id UUID
    REFERENCES users(id)
    ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_settings_updated
  ON system_settings(updated_at DESC);


CREATE TABLE system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  check_name VARCHAR(150) NOT NULL,

  component_type VARCHAR(50) NOT NULL,

  component_id UUID,

  status VARCHAR(30) NOT NULL
    CHECK (
      status IN (
        'HEALTHY',
        'DEGRADED',
        'UNHEALTHY',
        'UNKNOWN'
      )
    ),

  response_time_ms INTEGER
    CHECK (
      response_time_ms IS NULL
      OR response_time_ms >= 0
    ),

  error_message TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_checks_component
  ON system_health_checks(component_type, component_id);

CREATE INDEX idx_health_checks_status
  ON system_health_checks(status);

CREATE INDEX idx_health_checks_checked
  ON system_health_checks(checked_at DESC);


CREATE TABLE system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  alert_type VARCHAR(100) NOT NULL,

  severity VARCHAR(20) NOT NULL
    CHECK (
      severity IN (
        'INFO',
        'WARNING',
        'ERROR',
        'CRITICAL'
      )
    ),

  status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
    CHECK (
      status IN (
        'OPEN',
        'ACKNOWLEDGED',
        'RESOLVED',
        'DISMISSED'
      )
    ),

  title VARCHAR(255) NOT NULL,

  message TEXT NOT NULL,

  component_type VARCHAR(50),

  component_id UUID,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  acknowledged_by_user_id UUID
    REFERENCES users(id)
    ON DELETE SET NULL,

  resolved_by_user_id UUID
    REFERENCES users(id)
    ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  acknowledged_at TIMESTAMPTZ,

  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_system_alerts_status
  ON system_alerts(status);

CREATE INDEX idx_system_alerts_severity
  ON system_alerts(severity);

CREATE INDEX idx_system_alerts_component
  ON system_alerts(component_type, component_id);

CREATE INDEX idx_system_alerts_created
  ON system_alerts(created_at DESC);

COMMIT;
