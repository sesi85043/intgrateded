-- 0006_normalize_service_configs_url.sql
-- Idempotent migration to normalize Chatwoot URL stored in service_configs
-- It handles both legacy `base_url` and current `api_url` column names.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'service_configs' AND column_name = 'base_url'
  ) THEN
    UPDATE service_configs
    SET base_url = regexp_replace(base_url, '/+$', '')
    WHERE service_name = 'chatwoot' AND base_url IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'service_configs' AND column_name = 'api_url'
  ) THEN
    UPDATE service_configs
    SET api_url = regexp_replace(api_url, '/+$', '')
    WHERE service_name = 'chatwoot' AND api_url IS NOT NULL;
  END IF;
END
$$;

COMMIT;