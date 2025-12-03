#!/bin/sh
set -e

echo "================================"
echo "AdminHub Container Initialization"
echo "================================"
echo ""

# Show environment info
echo "[init] Node version: $(node --version)"
echo "[init] Working directory: $(pwd)"
echo "[init] Files in /app/dist:"
ls -la /app/dist/ 2>/dev/null || echo "  (dist folder not found!)"
echo ""
echo "[init] Files in /app/dist/public:"
ls -la /app/dist/public/ 2>/dev/null || echo "  (public folder not found!)"
echo ""

# Wait for database to be ready
echo "[db] Waiting for PostgreSQL to be ready..."
count=0
while ! pg_isready -h postgres -U postgres -d postgres >/dev/null 2>&1; do
  count=$((count + 1))
  if [ $count -gt 30 ]; then
    echo "[db] ❌ PostgreSQL failed to start"
    exit 1
  fi
  echo "[db] Attempt $count/30: Waiting for database..."
  sleep 1
done

echo "[db] ✓ PostgreSQL is ready!"

# Initialize database schema from SQL file (creates tables if they don't exist)
echo "[db] Initializing database schema..."
if [ -f /app/migrations/init.sql ]; then
  # Run init.sql to create tables (will fail gracefully if tables already exist)
  if PGPASSWORD="${PGPASSWORD:-postgres}" psql -h postgres -U "${PGUSER:-postgres}" -d "${PGDATABASE:-postgres}" -f /app/migrations/init.sql 2>&1; then
    echo "[db] ✓ Database schema initialized"
  else
    echo "[db] ⚠️ Schema init completed (tables may already exist)"
  fi
else
  echo "[db] ⚠️ No init.sql found, skipping schema creation"
fi

# Run migrations (ALTER TABLE statements for existing tables)
echo "[db] Running database migrations..."
if node dist/run-migration.js 2>&1; then
  echo "[db] ✓ Migrations completed"
else
  echo "[db] ⚠️ Migrations skipped (tables may not exist yet)"
fi

# Run seed (creates initial data)
echo "[db] Running database seed..."
if node dist/run-seed.js 2>&1; then
  echo "[db] ✓ Seed completed"
else
  echo "[db] ⚠️ Seed skipped or already applied"
fi

echo ""
echo "================================"
echo "✅ Initialization complete!"
echo "================================"
echo ""

exec "$@"
