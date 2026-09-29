BEGIN;

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID NOT NULL
    REFERENCES orders(id),

  payment_id UUID
    REFERENCES payments(id),

  wallet_id UUID NOT NULL
    REFERENCES wallets(id),

  amount_minor BIGINT NOT NULL
    CHECK (amount_minor > 0),

  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (
      status IN (
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
      )
    ),

  reason VARCHAR(100) NOT NULL,

  idempotency_key VARCHAR(255) NOT NULL UNIQUE,

  wallet_transaction_id UUID
    REFERENCES wallet_transactions(id),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_refunds_order
  ON refunds(order_id);

CREATE INDEX idx_refunds_payment
  ON refunds(payment_id);

CREATE INDEX idx_refunds_wallet
  ON refunds(wallet_id);

CREATE INDEX idx_refunds_status
  ON refunds(status);

CREATE INDEX idx_refunds_created
  ON refunds(created_at DESC);

COMMIT;
