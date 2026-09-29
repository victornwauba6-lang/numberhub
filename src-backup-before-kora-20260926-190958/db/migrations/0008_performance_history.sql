BEGIN;

CREATE TABLE option_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_option_id UUID NOT NULL
    REFERENCES product_options(id)
    ON DELETE CASCADE,

  sample_size INTEGER NOT NULL
    CHECK (sample_size >= 0),

  successful_count INTEGER NOT NULL
    CHECK (successful_count >= 0),

  failed_count INTEGER NOT NULL
    CHECK (failed_count >= 0),

  success_rate NUMERIC(5,2)
    CHECK (
      success_rate IS NULL
      OR (success_rate >= 0 AND success_rate <= 100)
    ),

  average_sms_delivery_seconds INTEGER
    CHECK (
      average_sms_delivery_seconds IS NULL
      OR average_sms_delivery_seconds >= 0
    ),

  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_performance_snapshots_option
  ON option_performance_snapshots(product_option_id);

CREATE INDEX idx_performance_snapshots_time
  ON option_performance_snapshots(snapshot_at DESC);

CREATE INDEX idx_performance_snapshots_option_time
  ON option_performance_snapshots(product_option_id, snapshot_at DESC);

COMMIT;
