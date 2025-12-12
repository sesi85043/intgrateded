# AdminHub: Simple VPS Deployment Steps (Local / VPS)

This file shows simple commands to deploy AdminHub on a VPS and local dev machine and includes common troubleshooting steps. These commands are written for PowerShell-based environments (Windows hosts) and POSIX where noted. Substitute your config values as needed.

Checklist before deploying:
- Ensure `git` and `node >= 18` are installed on the VPS
- PostgreSQL is reachable (container or service) and `DATABASE_URL` points to it
- You have the `SESSION_SECRET` and `CORS_ORIGIN` values set
- If you use Docker-compose for deployment, confirm docker and docker-compose are present

1) Export project from Replit (two options):

- 1A: Replit -> Export to GitHub (recommended)
  - Use Replit UI to push to GitHub (add a remote) and then pull your repo on the VPS

- 1B: Replit -> Download ZIP
  - Download ZIP from Replit and extract locally or on VPS
  - Or use the Replit repository to `git clone` if Replit exposes git remote

2) Clone or update repo on VPS:
```
# On VPS
git clone https://github.com/<your-org>/intgrateded.git ~/adminhub || cd ~/adminhub && git pull origin main
cd ~/adminhub
git checkout main
git pull origin main
```

3) Create `.env` file from `.env.example` on VPS and fill values (example using PowerShell):
```
cd ~/adminhub
Copy-Item .env.example .env
# Open .env in editor and fill values, or use PowerShell to set a variable
(Get-Content .env) -replace 'DATABASE_URL=', 'DATABASE_URL=postgresql://user:pass@dbhost:5432/postgres' | Set-Content .env
# Set other variables similarly; ensure SESSION_SECRET is a strong value
```

Generate a secure session secret:
```
# Linux / macOS
openssl rand -hex 32

# Or in PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

4) Install dependencies & build:
```
npm ci
npm run build
```

Important: If TypeScript building fails or `npm run build` fails because of ts errors, download the project locally and fix the errors before deploying. See the `Running locally` section below.

5) Database migrations and seed (IMPORTANT):
- If you have a running DB for the app, set `DATABASE_URL` and run (from the project root):
```
npm run db:push
```

- Only run seed once on a fresh DB to create admin user & roles
```
npm run seed
```

If migrations fail or some columns are missing, you can manually run the SQL files stored under `migrations/` by copying them to the Postgres container and executing `psql` (examples below).

Manual SQL run (when using Docker Compose on VPS):
```
# copy migration file into container and run
docker cp migrations/add_chatwoot_agent_columns.sql adminhub-postgres:/tmp/add_chatwoot_agent_columns.sql
docker exec -it adminhub-postgres psql -U postgres -d postgres -f /tmp/add_chatwoot_agent_columns.sql
```

6) Start the server (non-Docker)
```
npm run start
```

6b) If using Docker Compose (recommended on production):
```
docker compose up -d --build
```

7) Verify the service:
- Dev-login: this will create a dev admin session (local only; not for production):
```
curl -i -c cookies.txt http://127.0.0.1:5000/api/dev-login
```
- Check API endpoints:
```
curl -i -b cookies.txt http://127.0.0.1:5000/api/integrations/chatwoot/teams
curl -i -b cookies.txt http://127.0.0.1:5000/api/integrations/chatwoot/inboxes
curl -i -b cookies.txt http://127.0.0.1:5000/api/integrations/chatwoot/sso-url
```

Troubleshooting notes
- If `npm run db:push` doesn't create expected columns, confirm the `drizzle` migration runner is configured and that your environment uses the right `DATABASE_URL`.
- If `psql` shows missing columns but the app expects them, run the migration SQL files directly as shown above.
- Use `docker logs adminhub-app -n 200` to inspect 500/502 errors and `psql` to inspect the DB for missing columns.
- If `createChatwootAgent` fails, check Chatwoot `api_access_token` and account id (Chatwoot config).

Security considerations
- Use HTTPS in production and set `SESSION_COOKIE_SECURE=true` when serving over HTTPS.
- Keep `SESSION_SECRET` secure and do not commit `.env` to Git.
- If running on shared environment, consider using a secrets manager and environment systemd or docker secrets.
