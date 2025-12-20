CREATE TABLE "chatwoot_agents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" varchar NOT NULL,
	"chatwoot_agent_id" integer NOT NULL,
	"chatwoot_agent_email" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chatwoot_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_url" text NOT NULL,
	"api_access_token" text NOT NULL,
	"account_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sso_enabled" boolean DEFAULT false NOT NULL,
	"webhook_secret" text,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chatwoot_inboxes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" varchar NOT NULL,
	"chatwoot_inbox_id" integer NOT NULL,
	"chatwoot_inbox_name" varchar(100) NOT NULL,
	"inbox_type" varchar(30) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chatwoot_teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" varchar NOT NULL,
	"chatwoot_team_id" integer NOT NULL,
	"chatwoot_team_name" varchar(100) NOT NULL,
	"auto_assign" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "department_email_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" varchar NOT NULL,
	"parent_email" varchar NOT NULL,
	"imap_host" varchar(255),
	"imap_port" integer DEFAULT 993,
	"imap_username" varchar,
	"imap_password" text,
	"imap_use_ssl" boolean DEFAULT true NOT NULL,
	"smtp_host" varchar(255),
	"smtp_port" integer DEFAULT 587,
	"smtp_username" varchar,
	"smtp_password" text,
	"smtp_use_tls" boolean DEFAULT true NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "department_email_settings_department_id_unique" UNIQUE("department_id")
);
--> statement-breakpoint
CREATE TABLE "evolution_api_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_url" text NOT NULL,
	"api_key" text NOT NULL,
	"instance_name" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"webhook_url" text,
	"qr_code_data" text,
	"connection_status" varchar(30) DEFAULT 'disconnected',
	"last_connected_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mailcow_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_url" varchar,
	"api_key" text,
	"domain" varchar,
	"enabled" boolean DEFAULT true NOT NULL,
	"connection_status" varchar,
	"last_connected_at" timestamp,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_member_teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"added_at" timestamp DEFAULT now(),
	"added_by_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(30) NOT NULL,
	"description" text,
	"team_type" varchar(30) DEFAULT 'custom' NOT NULL,
	"department_id" varchar,
	"chatwoot_team_id" integer,
	"chatwoot_inbox_id" integer,
	"email_address" varchar,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "teams_name_unique" UNIQUE("name"),
	CONSTRAINT "teams_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "typebot_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_url" text NOT NULL,
	"api_token" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "typebot_flows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"typebot_config_id" varchar NOT NULL,
	"department_id" varchar,
	"typebot_id" varchar(100) NOT NULL,
	"flow_name" varchar(100) NOT NULL,
	"flow_description" text,
	"trigger_keywords" varchar(255)[] DEFAULT ARRAY[]::varchar[],
	"is_main_menu" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_numbers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evolution_config_id" varchar NOT NULL,
	"department_id" varchar,
	"phone_number" varchar(20) NOT NULL,
	"display_name" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chatwoot_agents" ADD CONSTRAINT "chatwoot_agents_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatwoot_inboxes" ADD CONSTRAINT "chatwoot_inboxes_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatwoot_teams" ADD CONSTRAINT "chatwoot_teams_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_email_settings" ADD CONSTRAINT "department_email_settings_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member_teams" ADD CONSTRAINT "team_member_teams_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member_teams" ADD CONSTRAINT "team_member_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member_teams" ADD CONSTRAINT "team_member_teams_added_by_id_team_members_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typebot_flows" ADD CONSTRAINT "typebot_flows_typebot_config_id_typebot_config_id_fk" FOREIGN KEY ("typebot_config_id") REFERENCES "public"."typebot_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typebot_flows" ADD CONSTRAINT "typebot_flows_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_numbers" ADD CONSTRAINT "whatsapp_numbers_evolution_config_id_evolution_api_config_id_fk" FOREIGN KEY ("evolution_config_id") REFERENCES "public"."evolution_api_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_numbers" ADD CONSTRAINT "whatsapp_numbers_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_team_member_teams_unique" ON "team_member_teams" USING btree ("team_member_id","team_id");