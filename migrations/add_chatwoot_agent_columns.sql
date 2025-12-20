-- Migration: add chatwoot agent columns
ALTER TABLE chatwoot_agents
  ADD COLUMN IF NOT EXISTS chatwoot_agent_id INTEGER,
  ADD COLUMN IF NOT EXISTS chatwoot_agent_email VARCHAR(255);

-- Optional: index on chatwoot_agent_id
CREATE INDEX IF NOT EXISTS idx_chatwoot_agents_chatwoot_agent_id ON chatwoot_agents(chatwoot_agent_id);
