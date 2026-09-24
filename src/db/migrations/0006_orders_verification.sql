BEGIN;

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id),

  wallet_id UUID NOT NULL
    REFERENCES wallets(id),

  product_option_id UUID NOT NULL
    REFERENCES product_options(id),

  country_id UUID NOT NULL
    REFERENCES countries(id),

  service_id UUID NOT NULL
    REFERENCES services(id),

  supplier_id UUID
    REFERENCES suppliers(id),

  status VARCHAR(40) NOT NULL DEFAULT 'CREATED'
    CHECK (
      status IN (
        'CREATED',
        'PROCESSING',
        'NUMBER_ASSIGNED',
        'WAITING_FOR_SMS',
        'CODE_RECEIVED',
        'COMPLETED',
        'FAILED',
        'REFUND_CHECK',
        'REFUNDED',
        'CANCELLED',
        'EXPIRED'
      )
    ),

  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  price_minor BIGINT NOT NULL
    CHECK (price_minor > 0),

  supplier_cost_minor BIGINT
    CHECK (
      supplier_cost_minor IS NULL
      OR supplier_cost_minor >= 0
    ),

  supplier_order_reference VARCHAR(255),

  idempotency_key VARCHAR(255) NOT NULL UNIQUE,

  purchase_limit_snapshot INTEGER,

  refund_enabled_snapshot BOOLEAN NOT NULL DEFAULT TRUE,

  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID NOT NULL
    REFERENCES orders(id)
    ON DELETE CASCADE,

  from_status VARCHAR(40),

  to_status VARCHAR(40) NOT NULL,

  event_type VARCHAR(50) NOT NULL,

  actor_user_id UUID
    REFERENCES users(id),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verification_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID NOT NULL UNIQUE
    REFERENCES orders(id)
    ON DELETE CASCADE,

  phone_number TEXT NOT NULL,

  country_code VARCHAR(5),

  supplier_number_reference VARCHAR(255),

  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  released_at TIMESTAMPTZ
);

CREATE TABLE verification_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID NOT NULL
    REFERENCES orders(id)
    ON DELETE CASCADE,

  verification_number_id UUID NOT NULL
    REFERENCES verification_numbers(id)
    ON DELETE CASCADE,

  message_hash VARCHAR(128),

  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  processed_at TIMESTAMPTZ,

  code_received BOOLEAN NOT NULL DEFAULT FALSE,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE supplier_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID
    REFERENCES orders(id)
    ON DELETE SET NULL,

  supplier_id UUID NOT NULL
    REFERENCES suppliers(id),

  route_id UUID
    REFERENCES option_supplier_routes(id),

  request_type VARCHAR(50) NOT NULL,

  request_reference VARCHAR(255),

  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (
      status IN (
        'PENDING',
        'PROCESSING',
        'SUCCESS',
        'FAILED',
        'TIMEOUT',
        'CANCELLED'
      )
    ),

  idempotency_key VARCHAR(255) NOT NULL UNIQUE,

  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  response_payload JSONB,

  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_user
  ON orders(user_id);

CREATE INDEX idx_orders_status
  ON orders(status);

CREATE INDEX idx_orders_product_option
  ON orders(product_option_id);

CREATE INDEX idx_orders_supplier
  ON orders(supplier_id);

CREATE INDEX idx_orders_created
  ON orders(created_at DESC);

CREATE INDEX idx_orders_expires
  ON orders(expires_at);

CREATE INDEX idx_order_events_order
  ON order_events(order_id);

CREATE INDEX idx_order_events_created
  ON order_events(created_at DESC);

CREATE INDEX idx_verification_messages_order
  ON verification_messages(order_id);

CREATE INDEX idx_verification_messages_received
  ON verification_messages(received_at DESC);

CREATE INDEX idx_supplier_requests_order
  ON supplier_requests(order_id);

CREATE INDEX idx_supplier_requests_supplier
  ON supplier_requests(supplier_id);

CREATE INDEX idx_supplier_requests_status
  ON supplier_requests(status);

COMMIT;
