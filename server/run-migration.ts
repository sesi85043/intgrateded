import { Client } from 'pg';

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
  // Normalize any existing cPanel hostnames: strip protocol, path, and port
  `UPDATE cpanel_config SET hostname = regexp_replace(split_part(regexp_replace(hostname, '^https?://', '', 'i'), '/', 1), ':\\d+$', '') WHERE hostname IS NOT NULL`,
  // Add integration-related columns (keeps SQL idempotent using IF NOT EXISTS)
  `ALTER TABLE IF EXISTS mailcow_config ADD COLUMN IF NOT EXISTS domain VARCHAR(255)`,
  `ALTER TABLE IF EXISTS mailcow_config ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50) DEFAULT 'disconnected'`,
  `ALTER TABLE IF EXISTS mailcow_config ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE IF EXISTS mailcow_config ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE IF EXISTS chatwoot_config ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE IF EXISTS evolution_api_config ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE IF EXISTS typebot_config ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE IF EXISTS department_email_settings ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255)`,
  `ALTER TABLE IF EXISTS team_members ADD COLUMN IF NOT EXISTS chatwoot_agent_id INTEGER`,
  `ALTER TABLE IF EXISTS departments ADD COLUMN IF NOT EXISTS chatwoot_inbox_id INTEGER`,
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
