import "dotenv/config";
import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const migrations = [
  // Drop the old foreign key constraint by its actual name
  `ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_admin_id_users_id_fk"`,
  `ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_admin_id_team_members_id_fk"`,
  
  // Add the new foreign key constraint referencing team_members instead of users
  `ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_admin_id_team_members_id_fk" FOREIGN KEY ("admin_id") REFERENCES "team_members"("id") ON DELETE CASCADE`,
];

async function runMigrations() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✓ Connected to database\n');
    
    for (const migration of migrations) {
      const shortSQL = migration.substring(0, 80).replace(/\n/g, ' ');
      process.stdout.write(`Running: ${shortSQL}... `);
      try {
        await client.query(migration);
        console.log('✓');
      } catch (e) {
        if (e.code === '42710') {
          console.log('(already exists)');
        } else {
          throw e;
        }
      }
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
