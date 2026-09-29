BEGIN;

CREATE TABLE option_supplier_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_option_id UUID NOT NULL
    REFERENCES product_options(id)
    ON DELETE CASCADE,

  supplier_id UUID NOT NULL
    REFERENCES suppliers(id),

  route_priority INTEGER NOT NULL DEFAULT 100,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  is_primary BOOLEAN NOT NULL DEFAULT FALSE,

  supplier_product_id VARCHAR(255),

  max_consecutive_failures INTEGER NOT NULL DEFAULT 3
    CHECK (max_consecutive_failures > 0),

  cooldown_seconds INTEGER NOT NULL DEFAULT 60
    CHECK (cooldown_seconds >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(product_option_id, supplier_id)
);

CREATE INDEX idx_supplier_routes_option
  ON option_supplier_routes(product_option_id);

CREATE INDEX idx_supplier_routes_supplier
  ON option_supplier_routes(supplier_id);

CREATE INDEX idx_supplier_routes_priority
  ON option_supplier_routes(product_option_id, route_priority);

CREATE INDEX idx_supplier_routes_active
  ON option_supplier_routes(is_active);

COMMIT;
