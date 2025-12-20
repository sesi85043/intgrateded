import "dotenv/config";
import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const migrations = [
  // Drop the old managed_users table and recreate with new schema
  `DROP TABLE IF EXISTS "managed_users" CASCADE`,
  
  // Create the new managed_users table with support for multiple platforms
  `CREATE TABLE "managed_users" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar NOT NULL,
    "full_name" varchar NOT NULL,
    "platforms" varchar(50)[] DEFAULT ARRAY[]::varchar[] NOT NULL,
    "platform_user_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "roles" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "status" varchar(20) DEFAULT 'active' NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
];

async function runMigrations() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✓ Connected to database\n');
    
    for (const migration of migrations) {
      const shortSQL = migration.substring(0, 80).replace(/\n/g, ' ');
      process.stdout.write(`Running: ${shortSQL}... `);
      await client.query(migration);
      console.log('✓');
    }
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
