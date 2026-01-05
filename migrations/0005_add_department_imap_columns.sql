-- Migration: Add IMAP-related columns to department_email_settings
-- This migration adds imap_host, imap_port, imap_username, imap_password, imap_use_ssl to
-- support department-specific IMAP settings for email integrations.

ALTER TABLE department_email_settings
  ADD COLUMN IF NOT EXISTS imap_host varchar(255),
  ADD COLUMN IF NOT EXISTS imap_port integer DEFAULT 993,
  ADD COLUMN IF NOT EXISTS imap_username varchar(255),
  ADD COLUMN IF NOT EXISTS imap_password text,
  ADD COLUMN IF NOT EXISTS imap_use_ssl boolean DEFAULT true NOT NULL;
