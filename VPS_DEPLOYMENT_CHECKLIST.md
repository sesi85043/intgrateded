# VPS Deployment Checklist

## Your SSH Public Key (to add to VPS)
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJjQufPh1aAAMX4ffAln/5jivE7ZuolZZNzHB8tW+/3k ntulodk@allelectronics.co.za
```

## Step 1: Get VPS Provider Details from Manager
Ask your manager for:
- [ ] VPS Provider name (Hetzner, DigitalOcean, Linode, etc.)
- [ ] Provider console URL
- [ ] Account email/username
- [ ] Account password
- [ ] Server IP: 158.220.107.106 (confirm it's listed)

## Step 2: Add SSH Key via Provider Console
Once you log into the provider's console:

1. Find server `158.220.107.106`
2. Click "Console", "VNC", or "Serial Console"
3. Log in as root (if prompted)
4. Paste these commands ONE AT A TIME:

```bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh
```

Then paste your entire public key into this command:
```bash
cat >> /root/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJjQufPh1aAAMX4ffAln/5jivE7ZuolZZNzHB8tW+/3k ntulodk@allelectronics.co.za
EOF
```

Then run:
```bash
chmod 600 /root/.ssh/authorized_keys
systemctl restart sshd
exit
```

## Step 3: Test SSH Key Login (from Windows)
Open PowerShell and run:
```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" root@158.220.107.106
```

If you see a command prompt without asking for password, success! ✓

## Step 4: Deploy from Windows
Once SSH key login works, run this from your project folder:

```powershell
cd "c:\Users\MM_SD\Downloads\DEPLOYMENT FOLDER\ADMINHUB\intgrateded"
```

Then run the PowerShell deployment script:
```powershell
.\Deploy-ToVPS.ps1
```

Or manually:
```powershell
# Create adminhub user
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" root@158.220.107.106 "adduser --disabled-password --gecos '' adminhub && usermod -aG sudo adminhub"

# Copy deployment files
scp -i "$env:USERPROFILE\.ssh\id_ed25519" -r docker-compose.yml .env.production vps-deploy.sh post-deploy.sh adminhub@158.220.107.106:/home/adminhub/

# Run deployment
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" adminhub@158.220.107.106 "cd /home/adminhub && bash vps-deploy.sh"
```

## Step 5: Run Post-Deployment Setup
```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" adminhub@158.220.107.106 "cd /home/adminhub && bash post-deploy.sh"
```

## Verify Deployment
Once complete, access your app at:
```
http://158.220.107.106:8080
```

Default login:
- Email: `admin@company.com`
- Password: `admin123` (change on first login!)

---

**Next Steps:**
1. Ask your manager for the VPS provider details
2. Follow Steps 2-5 above
3. Come back if you hit any issues
