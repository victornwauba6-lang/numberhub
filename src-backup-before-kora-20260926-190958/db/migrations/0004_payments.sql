BEGIN;

CREATE TABLE payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  supports_deposit BOOLEAN NOT NULL DEFAULT TRUE,
  supports_withdrawal BOOLEAN NOT NULL DEFAULT FALSE,
  supports_webhooks BOOLEAN NOT NULL DEFAULT FALSE,

  priority INTEGER NOT NULL DEFAULT 100,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id),

  wallet_id UUID NOT NULL
    REFERENCES wallets(id),

  provider_id UUID
    REFERENCES payment_providers(id),

  amount_minor BIGINT NOT NULL
    CHECK (amount_minor > 0),

  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  status VARCHAR(30) NOT NULL
    CHECK (
      status IN (
        'PENDING',
        'PROCESSING',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'REFUNDED'
      )
    ),

  payment_method VARCHAR(50),

  provider_reference VARCHAR(255),

  idempotency_key VARCHAR(255) NOT NULL UNIQUE,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id UUID NOT NULL
    REFERENCES payment_providers(id),

  event_id VARCHAR(255) NOT NULL,

  event_type VARCHAR(100),

  payment_id UUID
    REFERENCES payments(id),

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  processing_status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED'
    CHECK (
      processing_status IN (
        'RECEIVED',
        'PROCESSING',
        'PROCESSED',
        'FAILED',
        'IGNORED'
      )
    ),

  error_message TEXT,

  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  UNIQUE(provider_id, event_id)
);

CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID
    REFERENCES users(id),

  key VARCHAR(255) NOT NULL,

  operation VARCHAR(100) NOT NULL,

  request_hash VARCHAR(128) NOT NULL,

  response_status INTEGER,

  response_body JSONB,

  resource_type VARCHAR(50),

  resource_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  UNIQUE(user_id, key, operation)
);

CREATE INDEX idx_payments_user
  ON payments(user_id);

CREATE INDEX idx_payments_wallet
  ON payments(wallet_id);

CREATE INDEX idx_payments_provider
  ON payments(provider_id);

CREATE INDEX idx_payments_status
  ON payments(status);

CREATE INDEX idx_payments_provider_reference
  ON payments(provider_reference);

CREATE INDEX idx_payment_webhooks_payment
  ON payment_webhook_events(payment_id);

CREATE INDEX idx_payment_webhooks_status
  ON payment_webhook_events(processing_status);

CREATE INDEX idx_idempotency_user
  ON idempotency_keys(user_id);

CREATE INDEX idx_idempotency_expires
  ON idempotency_keys(expires_at);

COMMIT;
