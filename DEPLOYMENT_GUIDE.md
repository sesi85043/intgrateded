# AdminHub Docker Deployment Guide

## Quick Start

Your application is ready to be deployed to your VPS using Docker containers.

### VPS Information
- **IP Address:** 158.220.107.106
- **SSH Port:** 2022
- **Root User:** root
- **Password:** (Your root password)
- **External Port:** 8080
- **Database Password:** 0109115188087@Kdn

### Deployment Option 1: Automated Deployment (Recommended)

#### Prerequisites on Your Local Machine:
- Windows PowerShell or Git Bash
- SSH client
- (Optional) sshpass for password-based authentication

#### Steps:

1. **Install sshpass (if not already installed)**
   - Download from: https://github.com/lingkioxc/sshpass-win/releases
   - Or use: `choco install sshpass` (if you have Chocolatey)

2. **Run the deployment script**
   ```powershell
   .\Deploy-ToVPS.ps1
   ```
   - Enter your root password when prompted
   - The script will:
     - Package all necessary files
     - Transfer them to VPS
     - Build Docker images
     - Start containers
     - Initialize the database

3. **Access your application**
   - URL: http://158.220.107.106:8080
   - Email: admin@company.com
   - Password: admin123

---

### Deployment Option 2: Manual SSH Deployment

#### Step 1: Connect to VPS
```bash
ssh -p 2022 root@158.220.107.106
```

#### Step 2: Create deployment directory
```bash
mkdir -p /root/adminhub
cd /root/adminhub
```

#### Step 3: Transfer files from your local machine
Open a new terminal on your local machine and run:
```bash
scp -P 2022 -r ./Dockerfile root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./docker-compose.yml root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./.env.production root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./.dockerignore root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./package.json root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./package-lock.json root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./server root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./client root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./shared root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./migrations root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./tsconfig.json root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./vite.config.ts root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./drizzle.config.ts root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./postcss.config.js root@158.220.107.106:/root/adminhub/
scp -P 2022 -r ./tailwind.config.ts root@158.220.107.106:/root/adminhub/
```

#### Step 4: Run deployment script on VPS
Back in your SSH terminal:
```bash
cd /root/adminhub
chmod +x vps-deploy.sh
./vps-deploy.sh
```

---

### Deployment Option 3: Create tar archive and transfer

On your local machine:
```bash
tar --exclude=node_modules --exclude=.git --exclude=dist -czf adminhub-deploy.tar.gz \
  Dockerfile docker-compose.yml .env.production .dockerignore \
  package.json package-lock.json tsconfig.json vite.config.ts drizzle.config.ts \
  postcss.config.js tailwind.config.ts \
  server client shared migrations

scp -P 2022 adminhub-deploy.tar.gz root@158.220.107.106:/tmp/
```

On the VPS:
```bash
mkdir -p /root/adminhub
cd /root/adminhub
tar -xzf /tmp/adminhub-deploy.tar.gz
chmod +x vps-deploy.sh
./vps-deploy.sh
```

---

## Post-Deployment

### Access the Application
- URL: http://158.220.107.106:8080
- Email: admin@company.com
- Password: admin123

### Important: Change Admin Password
1. Login to the application
2. Navigate to user settings
3. Change the password immediately

### Useful Docker Commands

View application logs:
```bash
docker-compose logs -f app
```

View database logs:
```bash
docker-compose logs -f postgres
```

Restart application:
```bash
docker-compose restart app
```

Stop all containers:
```bash
docker-compose down
```

Restart everything:
```bash
docker-compose restart
```

Check container status:
```bash
docker-compose ps
```

Execute command in container:
```bash
docker-compose exec app npx tsx server/seed.ts
```

---

## Troubleshooting

### Cannot connect to VPS
- Check VPS IP: 158.220.107.106
- Check SSH Port: 2022
- Check password is correct
- Verify firewall allows port 2022

### Port 8080 not accessible
- Check if containers are running: `docker-compose ps`
- Check firewall rules on VPS: `sudo ufw status`
- Allow port 8080: `sudo ufw allow 8080`

### Database connection errors
- Check database container is healthy: `docker-compose ps`
- Check logs: `docker-compose logs postgres`
- Verify password in .env.production matches database password

### Application not starting
- Check logs: `docker-compose logs app`
- Verify .env.production file exists
- Verify all source files were transferred

### Reset everything
```bash
cd /root/adminhub
docker-compose down -v  # Remove containers and volumes
rm -rf /root/adminhub/*
# Transfer files again and run vps-deploy.sh
```

---

## Environment Variables

The `.env.production` file contains:

| Variable | Value | Notes |
|----------|-------|-------|
| NODE_ENV | production | Always production on VPS |
| PORT | 5000 | Internal container port (not exposed) |
| DB_NAME | adminhub | PostgreSQL database name |
| DB_USER | adminhub_user | PostgreSQL user |
| DB_PASSWORD | 0109115188087@Kdn | PostgreSQL password (stored securely) |
| EXTERNAL_PORT | 8080 | Port accessible from internet |
| SESSION_SECRET | (auto-generated) | Secure random string for session |

---

## Security Notes

✅ **Best Practices Applied:**
- Non-root container user (nodejs)
- Internal networking - database not exposed
- Health checks on both app and database
- Environment variables in separate .env file
- Process management with PM2
- Automatic restart on failure

⚠️ **Post-Deployment Security:**
1. Change admin password immediately
2. Set up SSL/TLS (consider using Nginx reverse proxy with Let's Encrypt)
3. Configure firewall rules
4. Monitor logs regularly
5. Set up automated backups for PostgreSQL

---

## Support

If you encounter any issues, check the logs:
```bash
docker-compose logs app
docker-compose logs postgres
```

For more information, refer to:
- Docker Documentation: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose
- PostgreSQL: https://www.postgresql.org/docs
