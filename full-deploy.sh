#!/bin/bash
set -e

echo "================================"
echo "AdminHub Full Deployment"
echo "================================"
echo ""

# Create app directory
mkdir -p /home/adminhub/app
cd /home/adminhub/app

echo "ℹ️ Waiting for app files to be copied..."
sleep 5

# Build and start Docker
echo "ℹ️ Building Docker images..."
docker-compose build

echo "ℹ️ Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "ℹ️ Waiting for services to start (30 seconds)..."
sleep 30

# Check if containers are running
echo "ℹ️ Checking container status..."
docker-compose ps

echo ""
echo "✅ Deployment complete!"
echo "ℹ️ App will be available at: http://158.220.107.106:8080"
echo "ℹ️ Run 'docker-compose logs -f' to see live logs"
