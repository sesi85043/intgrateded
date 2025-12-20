import "dotenv/config";
import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const migrations = [
  // Sessions table
  `CREATE TABLE IF NOT EXISTS "sessions" (
    "sid" varchar PRIMARY KEY NOT NULL,
    "sess" jsonb NOT NULL,
    "expire" timestamp NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_session_expire" on "sessions" ("expire")`,

  // Users table
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar UNIQUE,
    "first_name" varchar,
    "last_name" varchar,
    "profile_image_url" varchar,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Roles table
  `CREATE TABLE IF NOT EXISTS "roles" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(50) UNIQUE NOT NULL,
    "code" varchar(30) UNIQUE NOT NULL,
    "description" text,
    "level" integer NOT NULL DEFAULT 1,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Permissions table
  `CREATE TABLE IF NOT EXISTS "permissions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(100) UNIQUE NOT NULL,
    "code" varchar(50) UNIQUE NOT NULL,
    "description" text,
    "category" varchar(50),
    "created_at" timestamp DEFAULT now()
  )`,

  // Role Permissions table
  `CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "role_id" varchar NOT NULL REFERENCES "roles"("id"),
    "permission_id" varchar NOT NULL REFERENCES "permissions"("id"),
    "created_at" timestamp DEFAULT now()
  )`,

  // Departments table
  `CREATE TABLE IF NOT EXISTS "departments" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "email" varchar UNIQUE,
    "phone" varchar(20),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Team Members table - already exists with new columns, so we'll skip it

  // Service Configs table
  `CREATE TABLE IF NOT EXISTS "service_configs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "service_name" varchar(100) NOT NULL,
    "config_type" varchar(50) NOT NULL,
    "config_value" jsonb,
    "description" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Managed Users table
  `CREATE TABLE IF NOT EXISTS "managed_users" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "service_type" varchar(50) NOT NULL,
    "username" varchar(255) NOT NULL,
    "email" varchar,
    "status" varchar(20) DEFAULT 'active' NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Activity Logs table
  `CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "admin_id" varchar NOT NULL,
    "action" varchar(100) NOT NULL,
    "target_type" varchar(50),
    "target_id" varchar,
    "platform" varchar(50),
    "details" jsonb,
    "created_at" timestamp DEFAULT now()
  )`,

  // Analytics Metrics table
  `CREATE TABLE IF NOT EXISTS "analytics_metrics" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "platform" varchar(50) NOT NULL,
    "metric_type" varchar(100) NOT NULL,
    "metric_value" integer NOT NULL,
    "metric_data" jsonb,
    "period_start" timestamp,
    "period_end" timestamp,
    "created_at" timestamp DEFAULT now()
  )`,

  // Tasks table
  `CREATE TABLE IF NOT EXISTS "tasks" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text,
    "status" varchar(50) DEFAULT 'pending' NOT NULL,
    "priority" varchar(20) DEFAULT 'medium' NOT NULL,
    "department_id" varchar NOT NULL REFERENCES "departments"("id"),
    "created_by_id" varchar NOT NULL REFERENCES "team_members"("id"),
    "assigned_to_id" varchar REFERENCES "team_members"("id"),
    "due_date" timestamp,
    "completed_at" timestamp,
    "tags" varchar[],
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Task Assignments table
  `CREATE TABLE IF NOT EXISTS "task_assignments" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" varchar NOT NULL REFERENCES "tasks"("id"),
    "team_member_id" varchar NOT NULL REFERENCES "team_members"("id"),
    "assigned_by_id" varchar NOT NULL REFERENCES "team_members"("id"),
    "status" varchar(50) DEFAULT 'pending' NOT NULL,
    "assigned_at" timestamp DEFAULT now(),
    "completed_at" timestamp
  )`,

  // Task History table
  `CREATE TABLE IF NOT EXISTS "task_history" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" varchar NOT NULL REFERENCES "tasks"("id"),
    "changed_by_id" varchar NOT NULL REFERENCES "team_members"("id"),
    "change_type" varchar(50) NOT NULL,
    "old_value" jsonb,
    "new_value" jsonb,
    "created_at" timestamp DEFAULT now()
  )`,

  // Worklogs table
  `CREATE TABLE IF NOT EXISTS "worklogs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" varchar,
    "team_member_id" varchar NOT NULL REFERENCES "team_members"("id"),
    "hours_logged" numeric,
    "description" text,
    "log_date" timestamp DEFAULT now(),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Pending Registrations table
  `CREATE TABLE IF NOT EXISTS "pending_registrations" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar UNIQUE NOT NULL,
    "password_hash" text NOT NULL,
    "first_name" varchar(100),
    "last_name" varchar(100),
    "phone" varchar(20),
    "department_id" varchar NOT NULL REFERENCES "departments"("id"),
    "address_line_1" varchar(255),
    "address_line_2" varchar(255),
    "city" varchar(100),
    "state" varchar(100),
    "postal_code" varchar(20),
    "country" varchar(100),
    "next_of_kin_1_name" varchar(100),
    "next_of_kin_1_relationship" varchar(50),
    "next_of_kin_1_phone" varchar(20),
    "next_of_kin_1_email" varchar,
    "next_of_kin_1_address" text,
    "next_of_kin_2_name" varchar(100),
    "next_of_kin_2_relationship" varchar(50),
    "next_of_kin_2_phone" varchar(20),
    "next_of_kin_2_email" varchar,
    "next_of_kin_2_address" text,
    "status" varchar(50) DEFAULT 'pending' NOT NULL,
    "rejection_reason" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Approval OTPs table
  `CREATE TABLE IF NOT EXISTS "approval_otps" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "registration_id" varchar NOT NULL REFERENCES "pending_registrations"("id"),
    "otp_code" varchar(6) NOT NULL,
    "expires_at" timestamp NOT NULL,
    "is_used" boolean DEFAULT false NOT NULL,
    "used_at" timestamp,
    "used_by_id" varchar REFERENCES "team_members"("id"),
    "created_at" timestamp DEFAULT now()
  )`,

  // Admin Notifications table
  `CREATE TABLE IF NOT EXISTS "admin_notifications" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "type" varchar(50) NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "target_role_level" integer DEFAULT 3,
    "related_entity_type" varchar(50),
    "related_entity_id" varchar,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_by_id" varchar REFERENCES "team_members"("id"),
    "read_at" timestamp,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now()
  )`
];

async function runMigrations() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✓ Connected to database\n');
    
    for (const migration of migrations) {
      const shortSQL = migration.substring(0, 80).replace(/\n/g, ' ');
      process.stdout.write(`Running: ${shortSQL}... `);
      await client.query(migration);
      console.log('✓');
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
