import "dotenv/config";
import { db } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function fixSchema() {
  try {
    console.log("Adding missing columns to team_members table...");
    
    // Add missing address columns
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS address_line_1 varchar(255)`
    );
    console.log("✓ Added address_line_1");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS address_line_2 varchar(255)`
    );
    console.log("✓ Added address_line_2");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS city varchar(100)`
    );
    console.log("✓ Added city");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS state varchar(100)`
    );
    console.log("✓ Added state");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS postal_code varchar(20)`
    );
    console.log("✓ Added postal_code");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS country varchar(100)`
    );
    console.log("✓ Added country");
    
    // Add missing next of kin columns
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_1_name varchar(100)`
    );
    console.log("✓ Added next_of_kin_1_name");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_1_relationship varchar(50)`
    );
    console.log("✓ Added next_of_kin_1_relationship");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_1_phone varchar(20)`
    );
    console.log("✓ Added next_of_kin_1_phone");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_1_email varchar`
    );
    console.log("✓ Added next_of_kin_1_email");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_1_address text`
    );
    console.log("✓ Added next_of_kin_1_address");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_2_name varchar(100)`
    );
    console.log("✓ Added next_of_kin_2_name");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_2_relationship varchar(50)`
    );
    console.log("✓ Added next_of_kin_2_relationship");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_2_phone varchar(20)`
    );
    console.log("✓ Added next_of_kin_2_phone");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_2_email varchar`
    );
    console.log("✓ Added next_of_kin_2_email");
    
    await db.execute(
      sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS next_of_kin_2_address text`
    );
    console.log("✓ Added next_of_kin_2_address");
    
    console.log("\n✅ Schema fix complete! All missing columns have been added.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing schema:", error);
    process.exit(1);
  }
}

fixSchema();
