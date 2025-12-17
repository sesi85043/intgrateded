CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar NOT NULL,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" varchar,
	"platform" varchar(50),
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"target_role_level" integer DEFAULT 3,
	"related_entity_type" varchar(50),
	"related_entity_id" varchar,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_by_id" varchar,
	"read_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(50) NOT NULL,
	"metric_type" varchar(100) NOT NULL,
	"metric_value" integer NOT NULL,
	"metric_data" jsonb,
	"period_start" timestamp,
	"period_end" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_otps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" varchar NOT NULL,
	"otp_code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"used_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"code" varchar(10) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "departments_name_unique" UNIQUE("name"),
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "managed_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"full_name" varchar NOT NULL,
	"team_member_id" varchar,
	"platforms" varchar(50)[] DEFAULT ARRAY[]::varchar[] NOT NULL,
	"platform_user_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"roles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pending_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"phone" varchar(20),
	"department_id" varchar NOT NULL,
	"address_line_1" varchar(255) NOT NULL,
	"address_line_2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country" varchar(100) DEFAULT 'Nigeria' NOT NULL,
	"next_of_kin_1_name" varchar(100) NOT NULL,
	"next_of_kin_1_relationship" varchar(50) NOT NULL,
	"next_of_kin_1_phone" varchar(20) NOT NULL,
	"next_of_kin_1_email" varchar,
	"next_of_kin_1_address" text,
	"next_of_kin_2_name" varchar(100) NOT NULL,
	"next_of_kin_2_relationship" varchar(50) NOT NULL,
	"next_of_kin_2_phone" varchar(20) NOT NULL,
	"next_of_kin_2_email" varchar,
	"next_of_kin_2_address" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by_id" varchar,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pending_registrations_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"category" varchar(50),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_name_unique" UNIQUE("name"),
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar NOT NULL,
	"permission_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"code" varchar(30) NOT NULL,
	"description" text,
	"level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name"),
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "service_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" varchar(50) NOT NULL,
	"api_url" text NOT NULL,
	"api_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_configs_service_name_unique" UNIQUE("service_name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"team_member_id" varchar NOT NULL,
	"assigned_by_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"unassigned_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"changed_by_id" varchar NOT NULL,
	"action" varchar(50) NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"department_id" varchar NOT NULL,
	"created_by_id" varchar NOT NULL,
	"assigned_to_id" varchar,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"department_id" varchar NOT NULL,
	"role_id" varchar,
	"employee_id" varchar,
	"email" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"role" varchar(50) NOT NULL,
	"password_hash" text,
	"phone" varchar(20),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
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
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "team_members_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "team_members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "worklogs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"team_member_id" varchar NOT NULL,
	"hours_worked" integer,
	"minutes_worked" integer,
	"description" text,
	"work_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_admin_id_team_members_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_read_by_id_team_members_id_fk" FOREIGN KEY ("read_by_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_otps" ADD CONSTRAINT "approval_otps_registration_id_pending_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."pending_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_otps" ADD CONSTRAINT "approval_otps_used_by_id_team_members_id_fk" FOREIGN KEY ("used_by_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_users" ADD CONSTRAINT "managed_users_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD CONSTRAINT "pending_registrations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD CONSTRAINT "pending_registrations_reviewed_by_id_team_members_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_id_team_members_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_changed_by_id_team_members_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_team_members_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_team_members_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worklogs" ADD CONSTRAINT "worklogs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worklogs" ADD CONSTRAINT "worklogs_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");