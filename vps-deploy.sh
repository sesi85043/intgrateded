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

# Load env vars from .env.production so docker compose picks up SESSION_COOKIE_* and CORS settings
log_info "Loading environment variables from .env.production"
set -a
. ./.env.production
set +a

# Get service port and host for default CORS origin insertion (used below)
EXTERNAL_PORT=$(grep "EXTERNAL_PORT" .env.production | cut -d '=' -f2)
VPS_IP=$(hostname -I | awk '{print $1}')
ORIGIN="http://${VPS_IP}:${EXTERNAL_PORT}"

# Detect docker compose style (v2 `docker compose` vs v1 `docker-compose`)
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD=("docker" "compose" "--env-file" ".env.production")
else
    DOCKER_COMPOSE_CMD=("docker-compose")
fi

# Step 4: Create necessary directories
log_info "Step 4: Setting up directories..."
mkdir -p logs
mkdir -p migrations
log_success "Directories ready"

# Utility: ensure a CORS origin exists in .env.production without injecting duplicate entries
ensure_cors_origin() {
    local FILE=".env.production"
    local ORIGIN_VAL="$1"
    if ! grep -q "$ORIGIN_VAL" "$FILE" >/dev/null 2>&1; then
        if grep -q '^CORS_ORIGIN=' "$FILE" >/dev/null 2>&1; then
            # Use a capture group (\1) rather than the & replacement so PowerShell escaping is not required.
            # Use | as the sed delimiter to avoid needing to escape / in the URL.
            sed -i "s|^\(CORS_ORIGIN=.*\)|\1,$ORIGIN_VAL|" "$FILE"
        else
            echo "CORS_ORIGIN=$ORIGIN_VAL" >> "$FILE"
        fi
    fi
}

# Utility: ensure session cookie settings for cross-site requests are correctly configured
ensure_session_cookie_settings() {
    local FILE=".env.production"
    # Desired values for cross-site (frontend port != backend port)
    local SAMESITE_VAL="none"
    local SECURE_VAL="false"

    # Update or append SESSION_COOKIE_SAME_SITE (matches docker-compose env name)
    if grep -q "^SESSION_COOKIE_SAME_SITE=" "$FILE" >/dev/null 2>&1; then
        sed -i "s|^SESSION_COOKIE_SAME_SITE=.*|SESSION_COOKIE_SAME_SITE=$SAMESITE_VAL|" "$FILE"
    else
        echo "SESSION_COOKIE_SAME_SITE=$SAMESITE_VAL" >> "$FILE"
    fi

    # Update or append SESSION_COOKIE_SECURE
    if grep -q "^SESSION_COOKIE_SECURE=" "$FILE" >/dev/null 2>&1; then
        sed -i "s|^SESSION_COOKIE_SECURE=.*|SESSION_COOKIE_SECURE=$SECURE_VAL|" "$FILE"
    else
        echo "SESSION_COOKIE_SECURE=$SECURE_VAL" >> "$FILE"
    fi
}

# Step 5: Stop existing containers (if any)
log_info "Step 5: Ensuring CORS origin and session cookie settings, and cleaning up existing containers..."
ensure_cors_origin "$ORIGIN"
ensure_session_cookie_settings
"${DOCKER_COMPOSE_CMD[@]}" down 2>/dev/null || true
log_success "Cleanup complete"

# Step 6: Build Docker images
log_info "Step 6: Building Docker images..."
"${DOCKER_COMPOSE_CMD[@]}" build --no-cache
log_success "Images built successfully"

# Step 7: Start containers
log_info "Step 7: Starting containers..."
# Before starting, ensure the host EXTERNAL_PORT is free (avoid Docker bind errors)
check_port_owner() {
    local PORT="$1"
    if command -v ss >/dev/null 2>&1; then
        ss -ltnp | grep -E ":${PORT}\b" || true
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tulpn | grep ":${PORT}\b" || true
    elif command -v lsof >/dev/null 2>&1; then
        lsof -i :"${PORT}" -P -n || true
    else
        echo "(no ss/netstat/lsof available to check port)"
    fi
}

if [ -n "${EXTERNAL_PORT}" ]; then
    log_info "Checking whether host port ${EXTERNAL_PORT} is available..."
    PORT_INFO="$(check_port_owner "${EXTERNAL_PORT}")"
    if [ -n "${PORT_INFO}" ]; then
        log_error "Port ${EXTERNAL_PORT} appears to be in use on the host. Details:\n${PORT_INFO}"
        log_error "Please stop the process using this port or change EXTERNAL_PORT in .env.production and retry. Example checks: 'ss -ltnp | grep :${EXTERNAL_PORT}' or 'docker ps'"
        exit 1
    else
        log_success "Port ${EXTERNAL_PORT} appears free"
    fi
fi

"${DOCKER_COMPOSE_CMD[@]}" up -d
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
"${DOCKER_COMPOSE_CMD[@]}" ps
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
