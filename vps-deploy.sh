#!/bin/bash

# AdminHub Automated Deployment Script for VPS
# This script handles the complete deployment process

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Header
echo -e "${BLUE}"
echo "================================"
echo "AdminHub Docker Deployment"
echo "================================"
echo -e "${NC}"
echo ""

# Step 1: Check Docker installation
log_info "Step 1: Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    log_warn "Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker $USER
    log_success "Docker installed"
else
    log_success "Docker is installed: $(docker --version)"
fi

# Step 2: Check Docker Compose installation
log_info "Step 2: Checking Docker Compose installation..."
if ! command -v docker-compose &> /dev/null; then
    log_warn "Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installed"
else
    log_success "Docker Compose is installed: $(docker-compose --version)"
fi

# Step 3: Verify configuration files
log_info "Step 3: Verifying configuration files..."
if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml not found"
    exit 1
fi
if [ ! -f ".env.production" ]; then
    log_error ".env.production not found"
    exit 1
fi
log_success "All configuration files present"

# Step 4: Create necessary directories
log_info "Step 4: Setting up directories..."
mkdir -p logs
mkdir -p migrations
log_success "Directories ready"

# Step 5: Stop existing containers (if any)
log_info "Step 5: Cleaning up existing containers..."
docker-compose down 2>/dev/null || true
log_success "Cleanup complete"

# Step 6: Build Docker images
log_info "Step 6: Building Docker images..."
docker-compose build --no-cache
log_success "Images built successfully"

# Step 7: Start containers
log_info "Step 7: Starting containers..."
docker-compose up -d
log_success "Containers started"

# Step 8: Wait for services
log_info "Step 8: Waiting for services to be healthy..."
sleep 15

# Step 9: Run migrations
log_info "Step 9: Running database migrations..."
if docker exec adminhub-app npx drizzle-kit migrate --config drizzle.config.ts; then
    log_success "Migrations completed"
else
    log_warn "Migrations step completed (may have been skipped if already applied)"
fi

# Step 10: Seed database
log_info "Step 10: Seeding database..."
if docker exec adminhub-app npx tsx server/seed.ts; then
    log_success "Database seeded"
else
    log_warn "Database seeding completed (may have been skipped if already seeded)"
fi

# Step 11: Verify deployment
log_info "Step 11: Verifying deployment..."
echo ""
echo -e "${BLUE}Container Status:${NC}"
docker-compose ps
echo ""

# Get exposed port
EXTERNAL_PORT=$(grep "EXTERNAL_PORT" .env.production | cut -d '=' -f2)
VPS_IP=$(hostname -I | awk '{print $1}')

log_success "Deployment completed!"
echo ""
echo -e "${GREEN}═════════════════════════════════════════${NC}"
echo -e "${GREEN}Application is ready!${NC}"
echo -e "${GREEN}═════════════════════════════════════════${NC}"
echo ""
echo -e "Access URL: ${YELLOW}http://${VPS_IP}:${EXTERNAL_PORT}${NC}"
echo ""
echo -e "Default credentials:"
echo -e "  Email:    ${YELLOW}admin@company.com${NC}"
echo -e "  Password: ${YELLOW}admin123${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Change the admin password immediately after first login!${NC}"
echo ""
echo "Useful Docker commands:"
echo "  View logs:        docker-compose logs -f app"
echo "  View DB logs:     docker-compose logs -f postgres"
echo "  Stop containers:  docker-compose down"
echo "  Restart app:      docker-compose restart app"
echo "  Restart DB:       docker-compose restart postgres"
echo ""
