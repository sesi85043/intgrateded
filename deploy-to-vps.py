#!/usr/bin/env python3
"""
AdminHub VPS Deployment Script
Transfers files and deploys application to VPS
"""

import os
import subprocess
import sys
import getpass
from pathlib import Path

def run_command(cmd, check=True):
    """Run a shell command"""
    print(f"▶ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=False, text=True, check=False)
    if check and result.returncode != 0:
        print(f"❌ Command failed with exit code {result.returncode}")
        sys.exit(1)
    return result

def main():
    # Configuration
    VPS_IP = "158.220.107.106"
    VPS_PORT = "2022"
    VPS_USER = "root"
    DEPLOY_PATH = "/root/adminhub"
    
    print("=" * 50)
    print("AdminHub VPS Deployment")
    print("=" * 50)
    print()
    
    # Get password
    print(f"Connecting to VPS: {VPS_IP}:{VPS_PORT}")
    password = getpass.getpass("Enter VPS root password: ")
    print()
    
    # Files to transfer
    files_to_transfer = [
        "Dockerfile",
        "docker-compose.yml",
        ".env.production",
        ".dockerignore",
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "vite.config.ts",
        "drizzle.config.ts",
        "postcss.config.js",
        "tailwind.config.ts",
    ]
    
    directories_to_transfer = [
        "server",
        "client",
        "shared",
        "migrations",
    ]
    
    print("📦 Preparing files for transfer...")
    print()
    
    # Create a manifest of files
    manifest = []
    for f in files_to_transfer:
        if Path(f).exists():
            manifest.append(f)
            print(f"  ✓ {f}")
    
    for d in directories_to_transfer:
        if Path(d).exists():
            manifest.append(d)
            print(f"  ✓ {d}/")
    
    print()
    print(f"Total files: {len(manifest)}")
    print()
    
    # Create tar archive
    print("📦 Creating deployment package...")
    tar_cmd = f"tar --exclude=node_modules --exclude=.git --exclude=dist -czf adminhub-deploy.tar.gz {' '.join(manifest)}"
    run_command(tar_cmd)
    print("✅ Archive created: adminhub-deploy.tar.gz")
    print()
    
    # Use sshpass to connect and deploy
    print("📤 Transferring files to VPS...")
    print()
    
    scp_cmd = f'sshpass -p "{password}" scp -P {VPS_PORT} -r adminhub-deploy.tar.gz {VPS_USER}@{VPS_IP}:/tmp/'
    run_command(scp_cmd)
    print("✅ Files transferred")
    print()
    
    # Extract and deploy on VPS
    print("🚀 Starting deployment on VPS...")
    print()
    
    deploy_commands = f'''
mkdir -p {DEPLOY_PATH}
cd {DEPLOY_PATH}
tar -xzf /tmp/adminhub-deploy.tar.gz
chmod +x vps-deploy.sh
./vps-deploy.sh
'''
    
    ssh_cmd = f'sshpass -p "{password}" ssh -p {VPS_PORT} {VPS_USER}@{VPS_IP} "{deploy_commands}"'
    run_command(ssh_cmd, check=False)
    print()
    
    # Cleanup
    print("🧹 Cleaning up...")
    os.remove("adminhub-deploy.tar.gz")
    run_command(f'sshpass -p "{password}" ssh -p {VPS_PORT} {VPS_USER}@{VPS_IP} "rm -f /tmp/adminhub-deploy.tar.gz"', check=False)
    print("✅ Cleanup complete")
    print()
    
    print("=" * 50)
    print("✅ Deployment Complete!")
    print("=" * 50)
    print()
    print(f"Access your application at:")
    print(f"  http://{VPS_IP}:8080")
    print()
    print("Default credentials:")
    print("  Email: admin@company.com")
    print("  Password: admin123")
    print()
    print("⚠️  Change the password immediately!")
    print()

if __name__ == "__main__":
    main()
