BEGIN;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,

  full_name VARCHAR(150),

  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL UNIQUE
    REFERENCES users(id)
    ON DELETE CASCADE,

  balance_minor BIGINT NOT NULL DEFAULT 0
    CHECK (balance_minor >= 0),

  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  wallet_id UUID NOT NULL
    REFERENCES wallets(id),

  transaction_type VARCHAR(30) NOT NULL
    CHECK (
      transaction_type IN (
        'DEPOSIT',
        'PURCHASE',
        'REFUND',
        'ADJUSTMENT',
        'REVERSAL'
      )
    ),

  direction VARCHAR(10) NOT NULL
    CHECK (direction IN ('CREDIT', 'DEBIT')),

  amount_minor BIGINT NOT NULL
    CHECK (amount_minor > 0),

  balance_before_minor BIGINT NOT NULL
    CHECK (balance_before_minor >= 0),

  balance_after_minor BIGINT NOT NULL
    CHECK (balance_after_minor >= 0),

  reference VARCHAR(150) NOT NULL UNIQUE,

  external_reference VARCHAR(255),

  description TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email
  ON users(email);

CREATE INDEX idx_wallet_transactions_wallet
  ON wallet_transactions(wallet_id);

CREATE INDEX idx_wallet_transactions_created
  ON wallet_transactions(created_at DESC);

CREATE INDEX idx_wallet_transactions_type
  ON wallet_transactions(transaction_type);

CREATE INDEX idx_wallet_transactions_external_reference
  ON wallet_transactions(external_reference);

COMMIT;
