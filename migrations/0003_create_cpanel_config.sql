-- Create cpanel_config table (added to resolve runtime errors when table is missing)
CREATE TABLE IF NOT EXISTS public.cpanel_config (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname varchar(255) NOT NULL,
  api_token text NOT NULL,
  cpanel_username varchar(255) NOT NULL,
  domain varchar(255) NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  connection_status varchar(50),
  last_connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Optional index on hostname for quick lookups
CREATE INDEX IF NOT EXISTS IDX_cpanel_hostname ON public.cpanel_config (hostname);
