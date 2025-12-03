import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:0109115188087@Kdn@postgres:5432/postgres';

const migrations = [
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "address_line_1" varchar(255)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "address_line_2" varchar(255)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "city" varchar(100)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "state" varchar(100)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "postal_code" varchar(20)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "country" varchar(100)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_1_name" varchar(100)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_1_relationship" varchar(50)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_1_phone" varchar(20)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_1_email" varchar`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_1_address" text`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_2_name" varchar(100)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_2_relationship" varchar(50)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_2_phone" varchar(20)`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_2_email" varchar`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "next_of_kin_2_address" text`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false NOT NULL`,
];

async function runMigrations() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    for (const migration of migrations) {
      console.log(`Running: ${migration.substring(0, 70)}...`);
      await client.query(migration);
      console.log(`  ✓ Done`);
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
