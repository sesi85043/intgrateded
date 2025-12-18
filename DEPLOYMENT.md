# Admin Hub - Docker Deployment Guide

## Quick Start on VPS

### Prerequisites
- Docker and Docker Compose installed
- Linux VPS (Ubuntu 20.04+ recommended)
- 2GB+ RAM, 20GB+ disk space

### Deployment Steps

#### 1. Clone and Setup
```bash
git clone https://github.com/sesi85043/intgrateded.git
cd intgrateded
```

#### 2. Create `.env` File
```bash
cp .env.example .env
```

Edit `.env` with your VPS details:
```
# Database Configuration
DB_NAME=adminhub_db
DB_USER=adminhub_user
DB_PASSWORD=your_secure_password_here

# Application Configuration
NODE_ENV=production
EXTERNAL_PORT=9100
DATABASE_URL=postgresql://adminhub_user:your_secure_password_here@postgres:5432/adminhub_db

# Session Security
SESSION_SECRET=your_secure_session_secret_here
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=strict

# CORS Configuration (set your domain)
CORS_ORIGIN=https://yourdomain.com

# Admin Password (for first-time seeding)
ADMIN_PASSWORD=your_secure_admin_password_here
```

#### 3. Start Docker Containers
```bash
docker compose up -d
```

This will:
- Build the Node.js application image
- Start PostgreSQL database container
- Start the application container
- Run database migrations automatically
- Seed the database with roles, permissions, and admin account

#### 4. Configure CORS and Sessions for Your VPS

**CORS Configuration:**
```bash
# For local testing on the VPS:
CORS_ORIGIN=http://127.0.0.1:9100

# For production (replace with your actual domain):
CORS_ORIGIN=https://yourdomain.com

# For both local testing AND production domain:
CORS_ORIGIN=http://127.0.0.1:9100,https://yourdomain.com
```

**CRITICAL: Session Cookie Security Settings**

Your `.env` must have `SESSION_COOKIE_SECURE` set correctly for your protocol:

```bash
# For local testing with HTTP (http://127.0.0.1:9100):
SESSION_COOKIE_SECURE=false

# For production with HTTPS (https://yourdomain.com):
SESSION_COOKIE_SECURE=true
```

**⚠️ If they don't match, login will fail!** (Secure cookies won't be set over HTTP)

Then restart the app:
```bash
docker compose restart app
```

#### 5. Verify Deployment
```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f app

# Check for CORS errors
docker compose logs app | grep CORS

# Test the application
curl http://localhost:9100/api/auth/user
```

#### 6. First Login
- **Email**: `admin@company.com`
- **Password**: The value you set in `ADMIN_PASSWORD` env variable

---

## Docker Commands Reference

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f postgres
```

### Database Operations
```bash
# Connect to database shell
docker compose exec postgres psql -U adminhub_user -d adminhub_db

# Run migrations manually
docker compose exec app npm run db:push

# Run seed manually
docker compose exec app npm run seed
```

### Stop/Restart Services
```bash
# Stop all containers
docker compose down

# Restart app service
docker compose restart app

# Full restart with fresh data
docker compose down -v
docker compose up -d
```

### Access Application
- **Frontend & API**: `http://your-vps-ip:9100`
- **Database**: Internal only (not exposed), accessible via `docker compose exec`

---

## Security Best Practices

1. **Change Default Passwords**: Always update `DB_PASSWORD`, `SESSION_SECRET`, and `ADMIN_PASSWORD`
2. **HTTPS**: Use a reverse proxy (Nginx) with SSL certificate in production
3. **Firewall**: Open only port 9100 to your domain/trusted IPs
4. **Database Backups**: Set up regular backups of the `postgres_data` volume
5. **Update Containers**: Regularly pull the latest code and rebuild images

---

## Troubleshooting

### Database Connection Error
```
Error: getaddrinfo ENOTFOUND postgres
```
**Solution**: Ensure `DATABASE_URL` in `.env` uses `postgres` as hostname (Docker service name), not `localhost`

### Migrations Not Running
```bash
# Manually trigger migrations
docker compose exec app npm run db:push
```

### Seed Not Running
```bash
# Manually trigger seed with custom admin password
docker compose exec app bash -c "ADMIN_PASSWORD=newpassword npm run seed"
```

### Container Crashes
```bash
# Check logs
docker compose logs app

# Rebuild image
docker compose build --no-cache app
docker compose up -d
```

### Permission Denied on Entrypoint Script
```bash
# Fix Unix line endings (if copied from Windows)
docker compose build --no-cache
```

---

## Production Recommendations

### 1. Reverse Proxy (Nginx)
Set up Nginx to handle SSL/TLS, caching, and routing.

### 2. Database Backups
```bash
# Backup database
docker compose exec postgres pg_dump -U adminhub_user -d adminhub_db > backup.sql

# Restore backup
docker compose exec -T postgres psql -U adminhub_user -d adminhub_db < backup.sql
```

### 3. Monitoring
Monitor container health and application logs regularly using:
```bash
docker stats
docker compose logs --follow --tail=50
```

### 4. Update & Maintenance
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose build --no-cache
docker compose up -d
```

---

## Support

For issues or questions, check the logs:
```bash
docker compose logs -f app
docker compose logs -f postgres
```

Admin account for troubleshooting:
- Email: `admin@company.com`
- Password: (as set in `ADMIN_PASSWORD` env var)
