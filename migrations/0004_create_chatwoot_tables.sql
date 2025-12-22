-- Create Chatwoot integration tables
CREATE TABLE IF NOT EXISTS public.chatwoot_teams (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id varchar NOT NULL REFERENCES public.departments(id) ON DELETE cascade,
  chatwoot_team_id integer NOT NULL,
  chatwoot_team_name varchar(100) NOT NULL,
  auto_assign boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatwoot_inboxes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id varchar NOT NULL REFERENCES public.departments(id) ON DELETE cascade,
  chatwoot_inbox_id integer NOT NULL,
  chatwoot_inbox_name varchar(100) NOT NULL,
  inbox_type varchar(30) NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatwoot_agents (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id varchar NOT NULL REFERENCES public.team_members(id) ON DELETE cascade,
  chatwoot_agent_id integer NOT NULL,
  chatwoot_agent_email varchar,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS IDX_chatwoot_team_department ON public.chatwoot_teams (department_id);
CREATE INDEX IF NOT EXISTS IDX_chatwoot_inbox_department ON public.chatwoot_inboxes (department_id);
CREATE INDEX IF NOT EXISTS IDX_chatwoot_agent_team_member ON public.chatwoot_agents (team_member_id);
