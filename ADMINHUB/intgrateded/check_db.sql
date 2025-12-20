SELECT current_database() AS db;
SELECT version() AS pg_version;
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto','uuid-ossp');

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('department_email_settings','chatwoot_inboxes','chatwoot_agents','chatwoot_teams')
  AND column_name IN ('imap_host','chatwoot_inbox_id','chatwoot_agent_id','chatwoot_team_id','is_active','chatwoot_agent_email','chatwoot_inbox_name','chatwoot_team_name');

SELECT conrelid::regclass AS table_from, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype='f' AND conrelid::regclass::text IN ('chatwoot_agents','chatwoot_inboxes','chatwoot_teams','department_email_settings');
