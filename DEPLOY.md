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

PowerShell / Windows SSH note
```
# When calling long remote commands from PowerShell, prefer single quotes around the whole remote command
# so PowerShell does not interpret characters like `&`. Example (safe for PowerShell):
ssh root@158.220.107.106 'cd /opt/adminhub && \
if ! grep -q "http://158.220.107.106:9100" .env.production 2>/dev/null; then \
  if grep -q "^CORS_ORIGIN=" .env.production 2>/dev/null; then sed -i "s|^\(CORS_ORIGIN=.*\)|\1,http://158.220.107.106:9100|" .env.production; else echo "CORS_ORIGIN=http://158.220.107.106:9100" >> .env.production; fi; \
fi && \
docker compose --env-file .env.production down && docker compose --env-file .env.production pull --ignore-pull-failures && docker compose --env-file .env.production build --no-cache app && docker compose --env-file .env.production up -d app && docker compose --env-file .env.production logs -f --tail 200 app'
```
This uses a sed expression with a capture group (\1) rather than `&` so the line can be safely included inside single quotes from PowerShell.

Session cookie fix (PowerShell-safe)
```
# Set session cookie SAMESITE=None and SECURE=false so cookies work across ports (frontend:9100 -> backend:5000)
ssh root@158.220.107.106 'cd /opt/adminhub && \
if grep -q "^SESSION_COOKIE_SAMESITE=" .env 2>/dev/null; then sed -i "s|^SESSION_COOKIE_SAMESITE=.*|SESSION_COOKIE_SAMESITE=none|" .env; else echo "SESSION_COOKIE_SAMESITE=none" >> .env; fi; \
if grep -q "^SESSION_COOKIE_SECURE=" .env 2>/dev/null; then sed -i "s|^SESSION_COOKIE_SECURE=.*|SESSION_COOKIE_SECURE=false|" .env; else echo "SESSION_COOKIE_SECURE=false" >> .env; fi; \
if grep -q "^SESSION_COOKIE_SAMESITE=" .env.production 2>/dev/null; then sed -i "s|^SESSION_COOKIE_SAMESITE=.*|SESSION_COOKIE_SAMESITE=none|" .env.production; else echo "SESSION_COOKIE_SAMESITE=none" >> .env.production; fi; \
if grep -q "^SESSION_COOKIE_SECURE=" .env.production 2>/dev/null; then sed -i "s|^SESSION_COOKIE_SECURE=.*|SESSION_COOKIE_SECURE=false|" .env.production; else echo "SESSION_COOKIE_SECURE=false" >> .env.production; fi; \
docker compose --env-file .env.production up -d app && docker compose --env-file .env.production logs -f --tail 200 app'
```

After the restart, you should see the following lines in the app logs:

```
[auth] Replit session cookie secure=false sameSite=none
```

If you do, try logging in again from the frontend (port 9100) and then call `/api/auth/user`; it should now return 200 and show the user object (cookie will stick across ports).

Port already allocated (Bind for 0.0.0.0:8080 failed)
```
# If deploy fails with an error like:
#   Bind for 0.0.0.0:8080 failed: port is already allocated
# then some process on the host is already bound to the app's external port (EXTERNAL_PORT in .env.production).

# Quick diagnostic commands (run on the VPS):
ss -ltnp | grep :8080 || true
# or
sudo lsof -i :8080 -P -n || true
# or (if ss/netstat not available)
netstat -tulpn | grep :8080 || true

# If output shows a PID/process, either stop that service / kill the PID or change EXTERNAL_PORT in .env.production and redeploy.
# Also check Docker containers for port mappings:
docker ps --format "{{.ID}}\t{{.Names}}\t{{.Ports}}" | grep 8080 || true

# Example fixes
# 1) Stop the process/service using the port, e.g. if it's systemd-managed:
sudo systemctl stop <service-name>

# 2) Or stop the container using the port:
docker stop <container-id-or-name> && docker rm <container-id-or-name>

# 3) Or change EXTERNAL_PORT in .env.production to a free port and re-run deploy. Remember to update CORS accordingly.


Security considerations
- Use HTTPS in production and set `SESSION_COOKIE_SECURE=true` when serving over HTTPS.
- Keep `SESSION_SECRET` secure and do not commit `.env` to Git.
- If running on shared environment, consider using a secrets manager and environment systemd or docker secrets.
