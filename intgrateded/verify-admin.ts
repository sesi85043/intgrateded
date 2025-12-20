import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function verifyAdminAccount() {
  try {
    console.log('Verifying admin account...');
    
    // Check current admin status
    const checkResult = await pool.query(
      `SELECT id, email, is_verified FROM "team_members" WHERE email = $1`,
      ['admin@company.com']
    );
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Admin account not found');
      await pool.end();
      return;
    }
    
    const admin = checkResult.rows[0];
    console.log(`Found admin: ${admin.email}`);
    console.log(`Current is_verified: ${admin.is_verified}`);
    
    // Set admin as verified
    const updateResult = await pool.query(
      `UPDATE "team_members" SET is_verified = true WHERE email = $1 RETURNING *`,
      ['admin@company.com']
    );
    
    if (updateResult.rowCount > 0) {
      console.log('✓ Admin account verified successfully!');
      console.log(`✓ Email: ${updateResult.rows[0].email}`);
      console.log(`✓ is_verified: ${updateResult.rows[0].is_verified}`);
    } else {
      console.log('❌ Failed to update admin account');
    }
    
    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyAdminAccount();
