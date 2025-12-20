ALTER TABLE chatwoot_agents ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chatwoot_agents_is_active ON chatwoot_agents(is_active);
