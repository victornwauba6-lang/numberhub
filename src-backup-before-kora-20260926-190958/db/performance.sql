BEGIN;

CREATE TABLE option_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_option_id UUID NOT NULL
    REFERENCES product_options(id)
    ON DELETE CASCADE,

  sample_size INTEGER NOT NULL DEFAULT 0
    CHECK (sample_size >= 0),

  successful_count INTEGER NOT NULL DEFAULT 0
    CHECK (successful_count >= 0),

  failed_count INTEGER NOT NULL DEFAULT 0
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

  minimum_sample_size INTEGER NOT NULL DEFAULT 20
    CHECK (minimum_sample_size > 0),

  last_calculated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(product_option_id)
);

CREATE INDEX idx_option_performance_success_rate
  ON option_performance(success_rate);

CREATE INDEX idx_option_performance_sample_size
  ON option_performance(sample_size);

COMMIT;
