import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:0109115188087@Kdn@postgres:5432/postgres';

async function seed() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if super admin already exists
    const result = await client.query(
      'SELECT id FROM team_members WHERE email = $1',
      ['admin@company.com']
    );

    if (result.rows.length > 0) {
      console.log('✓ Super admin already exists, skipping seed');
      process.exit(0);
    }

    // Create Management role if it doesn't exist
    console.log('Creating/checking Management role...');
    await client.query(`
      INSERT INTO roles (name, code, description, level)
      VALUES ('Management', 'management', 'Full access to all departments and global user management', 3)
      ON CONFLICT (code) DO NOTHING
    `);
    const roleResult = await client.query(
      'SELECT id FROM roles WHERE code = $1',
      ['management']
    );
    const roleId = roleResult.rows[0].id;
    console.log('  ✓ Management role ready (ID: ' + roleId + ')');

    // Get or create Home Appliances department
    console.log('Creating/checking Home Appliances department...');
    await client.query(`
      INSERT INTO departments (name, code, description, status)
      VALUES ('Home Appliances', 'HA', 'Home Appliances Division', 'active')
      ON CONFLICT (code) DO NOTHING
    `);
    const deptResult = await client.query(
      'SELECT id FROM departments WHERE code = $1',
      ['HA']
    );
    const deptId = deptResult.rows[0].id;
    console.log('  ✓ Department ready (ID: ' + deptId + ')');

    // Hash password for the super admin at runtime to avoid stale/pre-computed hashes
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Create super admin
    console.log('Creating super admin user...');
    await client.query(`
      INSERT INTO team_members (
        department_id, role_id, employee_id, email, first_name, last_name,
        role, password_hash, phone, status, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (email) DO NOTHING
    `, [
      deptId,
      roleId,
      'ADMIN001',
      'admin@company.com',
      'System',
      'Administrator',
      'admin',
      passwordHash,
      '',
      'active',
      true  // isVerified = true for super admin
    ]);

    const adminResult = await client.query(
      'SELECT id, email FROM team_members WHERE email = $1',
      ['admin@company.com']
    );

    if (adminResult.rows.length > 0) {
      console.log('✅ Super admin created successfully!');
      console.log('   Email: admin@company.com');
      console.log('   Password: admin123');
      console.log('   Status: Verified (ready to login)');
    }

    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
