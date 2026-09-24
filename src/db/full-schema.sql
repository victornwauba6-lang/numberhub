-- NumberHub initial database schema
BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(2) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL UNIQUE,
  flag_emoji VARCHAR(10),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES countries(id),
  service_id UUID NOT NULL REFERENCES services(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(country_id, service_id)
);

CREATE TABLE product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  option_number INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,

  supplier_id UUID NOT NULL REFERENCES suppliers(id),

  price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
  promo_price_minor BIGINT CHECK (
    promo_price_minor IS NULL OR promo_price_minor >= 0
  ),

  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,

  supplier_product_id VARCHAR(255),

  priority INTEGER NOT NULL DEFAULT 100,

  purchase_limit_per_customer INTEGER
    CHECK (
      purchase_limit_per_customer IS NULL
      OR purchase_limit_per_customer > 0
    ),

  refund_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(product_id, option_number)
);

CREATE INDEX idx_products_country
  ON products(country_id);

CREATE INDEX idx_products_service
  ON products(service_id);

CREATE INDEX idx_product_options_product
  ON product_options(product_id);

CREATE INDEX idx_product_options_supplier
  ON product_options(supplier_id);

CREATE INDEX idx_product_options_active
  ON product_options(is_active, is_available);



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
