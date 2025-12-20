# AdminHub VPS Deployment Script for PowerShell
# This script transfers and deploys the application to your VPS

param(
    [string]$VpsIp = "158.220.107.106",
    [string]$VpsPort = "2022",
    [string]$VpsUser = "root",
    [string]$DeployPath = "/root/adminhub"
)

$ErrorActionPreference = "Stop"

function Write-Success {
    Write-Host "✅ $args" -ForegroundColor Green
}

function Write-Info {
    Write-Host "ℹ️  $args" -ForegroundColor Cyan
}

function Write-Error-Custom {
    Write-Host "❌ $args" -ForegroundColor Red
}

function Write-Warn {
    Write-Host "⚠️  $args" -ForegroundColor Yellow
}

# Main script
Write-Host "================================" -ForegroundColor Cyan
Write-Host "AdminHub VPS Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Info "VPS Configuration:"
Write-Host "  IP: $VpsIp"
Write-Host "  Port: $VpsPort"
Write-Host "  User: $VpsUser"
Write-Host "  Deploy Path: $DeployPath"
Write-Host ""

# Check if sshpass is available
$sshpassPath = Get-Command sshpass -ErrorAction SilentlyContinue
if (-not $sshpassPath) {
    Write-Error-Custom "sshpass is not installed or not in PATH"
    Write-Warn "Install it from: https://github.com/lingkioxc/sshpass-win/releases"
    exit 1
}

Write-Success "sshpass found"
Write-Host ""

# Get password securely
Write-Info "Enter your VPS root password:"
$password = Read-Host -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($password))

# Files and directories to transfer
$filesToTransfer = @(
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
    "tailwind.config.ts"
)

$dirsToTransfer = @(
    "server",
    "client",
    "shared",
    "migrations"
)

Write-Info "Verifying files..."
foreach ($file in $filesToTransfer) {
    if (-not (Test-Path $file)) {
        Write-Error-Custom "File not found: $file"
        exit 1
    }
}

foreach ($dir in $dirsToTransfer) {
    if (-not (Test-Path $dir -PathType Container)) {
        Write-Error-Custom "Directory not found: $dir"
        exit 1
    }
}

Write-Success "All files verified"
Write-Host ""

# Create tar archive
Write-Info "Creating deployment package..."
$tarArgs = @(
    "--exclude=node_modules",
    "--exclude=.git",
    "--exclude=dist",
    "-czf",
    "adminhub-deploy.tar.gz"
) + $filesToTransfer + $dirsToTransfer

& tar @tarArgs
Write-Success "Archive created: adminhub-deploy.tar.gz"
Write-Host ""

# Transfer files
Write-Info "Transferring files to VPS..."
$scpCmd = "sshpass -p `"$plainPassword`" scp -P $VpsPort -r adminhub-deploy.tar.gz ${VpsUser}@${VpsIp}:/tmp/"
Invoke-Expression $scpCmd
Write-Success "Files transferred"
Write-Host ""

# Deploy on VPS
Write-Info "Deploying on VPS..."
Write-Host ""

$deployScript = @"
set -e
mkdir -p $DeployPath
cd $DeployPath
tar -xzf /tmp/adminhub-deploy.tar.gz
chmod +x vps-deploy.sh
./vps-deploy.sh
"@

# Execute deployment
$sshCmd = "sshpass -p `"$plainPassword`" ssh -p $VpsPort ${VpsUser}@${VpsIp}"
$deployScript | & $sshCmd

Write-Host ""

# Cleanup
Write-Info "Cleaning up..."
Remove-Item -Path "adminhub-deploy.tar.gz" -Force
$cleanupCmd = "sshpass -p `"$plainPassword`" ssh -p $VpsPort ${VpsUser}@${VpsIp} `"rm -f /tmp/adminhub-deploy.tar.gz`""
Invoke-Expression $cleanupCmd
Write-Success "Cleanup complete"
Write-Host ""

# Final summary
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application at:"
Write-Host "  http://${VpsIp}:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "Default credentials:"
Write-Host "  Email: admin@company.com"
Write-Host "  Password: admin123" -ForegroundColor Yellow
Write-Host ""
Write-Warn "Change the password immediately after first login!"
Write-Host ""
