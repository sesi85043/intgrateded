import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function addIsVerifiedColumn() {
  try {
    console.log('Adding is_verified column to team_members table...');
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'));
    
    await pool.query(`
      ALTER TABLE "team_members" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;
    `);
    
    console.log('✓ Successfully added is_verified column');
    
    // Mark all existing users as verified so they can still login
    const result = await pool.query(`
      UPDATE "team_members" SET "is_verified" = true WHERE "is_verified" IS NULL;
    `);
    
    console.log(`✓ Updated existing users - ${result.rowCount} rows affected`);
    
    await pool.end();
    console.log('Done!');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('✓ Column already exists - skipping');
      // Mark all existing users as verified
      try {
        await pool.query(`
          UPDATE "team_members" SET "is_verified" = true WHERE "is_verified" IS NULL;
        `);
        console.log('✓ Updated existing users to verified');
      } catch (e) {
        console.log('No updates needed');
      }
      await pool.end();
    } else {
      console.error('Error adding column:', error.message);
      await pool.end();
      process.exit(1);
    }
  }
}

addIsVerifiedColumn();
