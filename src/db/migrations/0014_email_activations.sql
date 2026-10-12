BEGIN;

CREATE TABLE IF NOT EXISTS email_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id),

  wallet_id UUID NOT NULL
    REFERENCES wallets(id),

  provider VARCHAR(40) NOT NULL DEFAULT 'smsbulk',

  provider_activation_id VARCHAR(255) UNIQUE,

  site VARCHAR(253) NOT NULL,
  domain VARCHAR(253) NOT NULL,
  email_address TEXT,

  status VARCHAR(40) NOT NULL DEFAULT 'CREATED'
    CHECK (
      status IN (
        'CREATED',
        'PROCESSING',
        'PENDING',
        'CODE_RECEIVED',
        'COMPLETED',
        'CANCEL_PENDING',
        'CANCELLED',
        'EXPIRED',
        'FAILED',
        'UNKNOWN',
        'REFUND_PENDING',
        'REFUNDED'
      )
    ),

  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  price_minor BIGINT NOT NULL
    CHECK (price_minor > 0),

  supplier_price NUMERIC(18, 8),
  supplier_currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  otp TEXT,
  html TEXT,

  idempotency_key VARCHAR(255) NOT NULL UNIQUE,

  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  error_message TEXT,

  expires_at TIMESTAMPTZ,
  last_polled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_activations_user_created
  ON email_activations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_activations_status
  ON email_activations(status);

CREATE INDEX IF NOT EXISTS idx_email_activations_provider_id
  ON email_activations(provider_activation_id);

COMMIT;
