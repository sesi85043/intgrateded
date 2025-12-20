-- 0002_add_integration_columns.sql
-- Idempotent migration to add missing integration and support columns
-- Created: 2025-12-09

BEGIN;

-- Mailcow: domain + status columns
ALTER TABLE IF EXISTS mailcow_config ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
ALTER TABLE IF EXISTS mailcow_config ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50) DEFAULT 'disconnected';
ALTER TABLE IF EXISTS mailcow_config ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS mailcow_config ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Add last_sync_at to other integration configs
ALTER TABLE IF EXISTS chatwoot_config ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS evolution_api_config ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS typebot_config ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Department / Chatwoot compatibility fixes
ALTER TABLE IF EXISTS department_email_settings ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);
ALTER TABLE IF EXISTS team_members ADD COLUMN IF NOT EXISTS chatwoot_agent_id INTEGER;
ALTER TABLE IF EXISTS departments ADD COLUMN IF NOT EXISTS chatwoot_inbox_id INTEGER;

COMMIT;

-- Notes:
-- This migration is intentionally idempotent (uses IF EXISTS / IF NOT EXISTS).
-- Because the containered migration runner has an ESM/CJS mismatch, you can apply this
-- migration manually with psql in the Postgres container, or keep it in the repo so
-- future migration tooling can pick it up once the runner is fixed.
