BEGIN;

CREATE TABLE manual_funding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  wallet_id UUID NOT NULL
    REFERENCES wallets(id)
    ON DELETE CASCADE,

  funding_id VARCHAR(30) NOT NULL UNIQUE,

  amount_minor BIGINT NOT NULL
    CHECK (amount_minor > 0),

  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

  admin_user_id UUID
    REFERENCES users(id),

  admin_note TEXT,

  wallet_transaction_id UUID
    REFERENCES wallet_transactions(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_manual_funding_user
  ON manual_funding_requests(user_id);

CREATE INDEX idx_manual_funding_status
  ON manual_funding_requests(status);

CREATE INDEX idx_manual_funding_created
  ON manual_funding_requests(created_at DESC);

CREATE UNIQUE INDEX idx_manual_funding_wallet_transaction
  ON manual_funding_requests(wallet_transaction_id)
  WHERE wallet_transaction_id IS NOT NULL;

COMMIT;
