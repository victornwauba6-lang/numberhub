BEGIN;

ALTER TABLE option_supplier_routes
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0
  CHECK (consecutive_failures >= 0);

ALTER TABLE option_supplier_routes
ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ;

ALTER TABLE option_supplier_routes
ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ;

COMMIT;
