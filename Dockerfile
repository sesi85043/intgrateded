# Build stage - using official Node image with full build tools
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all source files
COPY . .

# Install all dependencies (including dev) - use `npm install` to avoid lockfile mismatches across npm versions
RUN npm install

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install PM2 and postgresql-client for database operations
RUN npm install -g pm2 && \
    apk add --no-cache postgresql-client

# Copy package files for production install
COPY package.json package-lock.json ./

# Copy tsconfig so tsconfig-paths can resolve path aliases at runtime
COPY tsconfig.json ./

# Install only production dependencies  
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Copy entrypoint script
COPY docker-entrypoint.sh /app/
# FIX: Ensure file has Unix line endings and executable permission (strip CRLF introduced on Windows)
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Create non-root user for security (but run as root for init)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/auth/user', (r) => {if (r.statusCode !== 401 && r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose internal port (not accessible from outside, only via port mapping)
EXPOSE 5000

# Use entrypoint script for initialization, then start PM2
CMD ["/app/docker-entrypoint.sh", "pm2-runtime", "start", "dist/index.js", "--name", "adminhub"]
