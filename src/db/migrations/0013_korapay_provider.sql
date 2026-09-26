BEGIN;

INSERT INTO payment_providers (
  name,
  slug,
  is_active,
  supports_deposit,
  supports_withdrawal,
  supports_webhooks,
  priority
)
VALUES (
  'Korapay',
  'korapay',
  TRUE,
  TRUE,
  FALSE,
  TRUE,
  1
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  supports_deposit = EXCLUDED.supports_deposit,
  supports_withdrawal = EXCLUDED.supports_withdrawal,
  supports_webhooks = EXCLUDED.supports_webhooks,
  priority = EXCLUDED.priority,
  updated_at = NOW();

COMMIT;
