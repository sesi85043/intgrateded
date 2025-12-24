import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

async function previewNormalization() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✓ Connected to database');

    const rows = await client.query(`SELECT id, hostname, regexp_replace(split_part(regexp_replace(hostname, '^https?://', '', 'i'), '/', 1), ':\\d+$', '') AS normalized FROM cpanel_config WHERE hostname IS NOT NULL`);

    if (rows.rows.length === 0) {
      console.log('No cPanel config hostnames found');
      return;
    }

    console.log('\nPreview of hostname normalization (current -> normalized):\n');
    for (const r of rows.rows) {
      console.log(`${r.id}  |  ${r.hostname}  ->  ${r.normalized}`);
    }
  } catch (err) {
    console.error('Error previewing normalization:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

previewNormalization();
