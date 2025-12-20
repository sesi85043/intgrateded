#!/bin/bash

# Post-deployment setup script
# Run this after containers are up to initialize the database

echo "================================"
echo "AdminHub Post-Deployment Setup"
echo "================================"
echo ""

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec adminhub-postgres pg_isready -U postgres &> /dev/null; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    echo "Attempt $i/30 - waiting for database..."
    sleep 1
done

echo ""
echo "🔄 Running database migrations..."
docker exec adminhub-app npx drizzle-kit migrate --config drizzle.config.ts

echo ""
echo "🌱 Seeding database..."
docker exec adminhub-app npx tsx server/seed.ts

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Login credentials:"
echo "  Email: admin@company.com"
echo "  Password: admin123"
echo ""
echo "⚠️  IMPORTANT: Change the admin password immediately after first login!"
echo ""
