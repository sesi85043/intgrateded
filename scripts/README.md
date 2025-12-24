vps-fix.sh
=============

This folder contains helper scripts intended to be run on the VPS to
apply a small set of emergency fixes related to integrations (cPanel,
Chatwoot) and to run built migrations after a deploy.

scripts/vps-fix.sh
------------------
- Creates a DB backup in `/root/adminhub/backups`
- Adds the `parent_email` column if missing
- Normalizes Chatwoot `base_url` values (removes trailing slashes)
- Runs `node dist/run-migration.mjs` inside the `app` container
- Restarts the `app` container and tails logs for `chatwoot` and `provisioning`

Usage
-----
Run this script on the VPS in the project root:

sudo bash scripts/vps-fix.sh

Note: the script is intentionally interactive and verbose. It assumes Docker
Compose is available and that containers are named `adminhub-postgres` and
`adminhub-app` (as in the repo's `docker-compose.yml`).
