BEGIN;

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES
(
  'pricing.currency_rates',
  '{"USD":1331.73}'::jsonb,
  'Supplier-currency to NGN exchange rates used by the NumberHub pricing engine.'
),
(
  'pricing.default_markup',
  '{"bands":[{"max_cost_minor":20000,"price_minor":80000},{"max_cost_minor":40000,"price_minor":90000},{"max_cost_minor":59900,"price_minor":110000},{"min_cost_minor":60000,"multiplier":2}]}'::jsonb,
  'Default customer pricing rules. NGN amounts are stored in kobo.'
),
(
  'pricing.rounding',
  '{"currency":"NGN","mode":"nearest_100"}'::jsonb,
  'Customer-price rounding configuration for NGN prices.'
),
(
  'pricing.manual_overrides',
  '{"textverified":{"facebook":150000,"whatsapp":400000},"fivesim":{"virtual8":323200,"virtual28":457000,"virtual51":320000,"virtual63":460000}}'::jsonb,
  'Manual customer prices in NGN minor units. These override automatic pricing for matching supplier options.'
)
ON CONFLICT (setting_key)
DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

COMMIT;
