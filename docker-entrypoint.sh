#!/bin/sh
set -e

echo "Starting AdminHub initialization..."

# Wait for database to be ready
echo "Waiting for PostgreSQL to be ready..."
count=0
while ! pg_isready -h postgres -U postgres -d postgres >/dev/null 2>&1; do
  count=$((count + 1))
  if [ $count -gt 30 ]; then
    echo "PostgreSQL failed to start"
    exit 1
  fi
  echo "Attempt $count/30: Waiting for database..."
  sleep 1
done

echo "✓ PostgreSQL is ready!"

# Run migrations
echo "Running database migrations..."
if node dist/run-migration.js; then
  echo "✓ Migrations completed"
else
  echo "⚠️ Migrations failed or already applied"
fi

# Run seed
echo "Running database seed..."
if node dist/run-seed.js; then
  echo "✓ Seed completed"
else
  echo "⚠️ Seed failed or already applied"
fi

echo "✅ Initialization complete!"
exec "$@"
