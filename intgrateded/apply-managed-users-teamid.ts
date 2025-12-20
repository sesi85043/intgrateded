import "dotenv/config";
import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`ALTER TABLE managed_users ADD COLUMN IF NOT EXISTS team_member_id varchar`);
    try {
      await client.query(`ALTER TABLE managed_users ADD CONSTRAINT managed_users_team_member_id_fk FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE SET NULL`);
    } catch (e: any) {
      if (e.code === '42710') {
        console.log('constraint already exists, skipping');
      } else {
        throw e;
      }
    }
    console.log('✅ Applied managed_users team_member_id migration');
  } catch (e) {
    console.error('Migration error', e);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

run();
