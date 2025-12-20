-- Migration: Add missing columns to Chatwoot and Email Settings tables
-- This migration adds columns that are expected by the application schema

-- For chatwoot_teams table
-- Add department_id if it doesn't exist
ALTER TABLE chatwoot_teams
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE CASCADE;

-- Add chatwoot_team_id and chatwoot_team_name if they don't exist (using existing columns as aliases if needed)
ALTER TABLE chatwoot_teams
ADD COLUMN IF NOT EXISTS chatwoot_team_id INTEGER,
ADD COLUMN IF NOT EXISTS chatwoot_team_name VARCHAR(100);

-- Add auto_assign if it doesn't exist
ALTER TABLE chatwoot_teams
ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN DEFAULT true;

-- For chatwoot_inboxes table
-- Add chatwoot_inbox_id if it doesn't exist
ALTER TABLE chatwoot_inboxes
ADD COLUMN IF NOT EXISTS chatwoot_inbox_id INTEGER;

-- Add chatwoot_inbox_name if it doesn't exist
ALTER TABLE chatwoot_inboxes
ADD COLUMN IF NOT EXISTS chatwoot_inbox_name VARCHAR(100);

-- Add inbox_type if it doesn't exist (channel_type might be the same)
ALTER TABLE chatwoot_inboxes
ADD COLUMN IF NOT EXISTS inbox_type VARCHAR(30);

-- Add enabled if it doesn't exist
ALTER TABLE chatwoot_inboxes
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- For department_email_settings table
-- Add IMAP columns
ALTER TABLE department_email_settings
ADD COLUMN IF NOT EXISTS imap_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS imap_port INTEGER,
ADD COLUMN IF NOT EXISTS imap_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS imap_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS imap_use_ssl BOOLEAN DEFAULT true;

-- Add SMTP columns
ALTER TABLE department_email_settings
ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS smtp_port INTEGER,
ADD COLUMN IF NOT EXISTS smtp_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS smtp_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS smtp_use_tls BOOLEAN DEFAULT true;

-- Add enabled if it doesn't exist
ALTER TABLE department_email_settings
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT false;

-- Add last_sync_at if it doesn't exist
ALTER TABLE department_email_settings
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;
