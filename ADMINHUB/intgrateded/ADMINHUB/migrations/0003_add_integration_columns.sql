-- Migration: Add missing integration-related columns to integration config tables
-- Adds webhook_url, websocket_url, and qr_code_data columns if they don't exist

-- Evolution API config additions
ALTER TABLE evolution_api_config
  ADD COLUMN IF NOT EXISTS webhook_url TEXT;

ALTER TABLE evolution_api_config
  ADD COLUMN IF NOT EXISTS websocket_url TEXT;

ALTER TABLE evolution_api_config
  ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

ALTER TABLE evolution_api_config
  ADD COLUMN IF NOT EXISTS connection_status TEXT;

ALTER TABLE evolution_api_config
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE evolution_api_config
  ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE evolution_api_config
  ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP WITH TIME ZONE;

-- Chatwoot config additions
ALTER TABLE chatwoot_config
  ADD COLUMN IF NOT EXISTS webhook_url TEXT;

ALTER TABLE chatwoot_config
  ADD COLUMN IF NOT EXISTS websocket_url TEXT;

ALTER TABLE chatwoot_config
  ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

ALTER TABLE chatwoot_config
  ADD COLUMN IF NOT EXISTS connection_status TEXT;

ALTER TABLE chatwoot_config
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE chatwoot_config
  ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE chatwoot_config
  ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP WITH TIME ZONE;

-- Idempotent rename in case some environments still have base_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatwoot_config' AND column_name = 'base_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatwoot_config' AND column_name = 'instance_url'
  ) THEN
    ALTER TABLE chatwoot_config RENAME COLUMN base_url TO instance_url;
  END IF;
END$$;
