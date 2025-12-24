import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

async function verifyNormalization() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✓ Connected to database');

    const problematic = await client.query(`SELECT id, hostname FROM cpanel_config WHERE hostname ~* '^(https?://)|/|:\\d+$'`);

    if (problematic.rows.length === 0) {
      console.log('\n✅ No hostnames with protocol, path, or explicit port found. Normalization looks good.');
    } else {
      console.log('\n⚠️ Found hostnames that may still be problematic:');
      for (const r of problematic.rows) {
        console.log(`${r.id}  |  ${r.hostname}`);
      }
      process.exit(2);
    }
  } catch (err) {
    console.error('Error verifying normalization:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyNormalization();
