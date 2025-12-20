import "dotenv/config";
import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const migrations = [
  // Add missing columns to pending_registrations
  `ALTER TABLE "pending_registrations" ADD COLUMN IF NOT EXISTS "reviewed_by_id" varchar REFERENCES "team_members"("id")`,
  `ALTER TABLE "pending_registrations" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp`,
  
  // Update existing columns to be NOT NULL where needed
  `ALTER TABLE "pending_registrations" ALTER COLUMN "first_name" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "last_name" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "address_line_1" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "city" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "state" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "postal_code" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "country" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "next_of_kin_1_name" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "next_of_kin_1_relationship" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "next_of_kin_1_phone" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "next_of_kin_2_name" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "next_of_kin_2_relationship" SET NOT NULL`,
  `ALTER TABLE "pending_registrations" ALTER COLUMN "next_of_kin_2_phone" SET NOT NULL`,
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
