CREATE TABLE "agent_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"team_member_id" varchar NOT NULL,
	"chatwoot_agent_id" integer,
	"assigned_at" timestamp DEFAULT now(),
	"unassigned_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatwoot_contact_id" integer NOT NULL,
	"name" varchar(100),
	"email" varchar(100),
	"phone" varchar(20),
	"avatar" text,
	"timezone" varchar(100),
	"last_seen_at" timestamp,
	"metadata" jsonb,
	"chatwoot_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"synced_at" timestamp DEFAULT now(),
	CONSTRAINT "contacts_chatwoot_contact_id_unique" UNIQUE("chatwoot_contact_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatwoot_conversation_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"channel" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"subject" varchar(255),
	"unread_count" integer DEFAULT 0,
	"last_message_at" timestamp,
	"assigned_agent_id" integer,
	"department_id" varchar,
	"metadata" jsonb,
	"chatwoot_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"synced_at" timestamp DEFAULT now(),
	CONSTRAINT "conversations_chatwoot_conversation_id_unique" UNIQUE("chatwoot_conversation_id")
);
--> statement-breakpoint
CREATE TABLE "cpanel_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostname" varchar NOT NULL,
	"api_token" text NOT NULL,
	"cpanel_username" varchar NOT NULL,
	"domain" varchar NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"connection_status" varchar,
	"last_connected_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" text NOT NULL,
	"provider" varchar(20) NOT NULL,
	"quota" integer DEFAULT 512,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatwoot_message_id" integer NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_type" varchar(30) NOT NULL,
	"sender_name" varchar(100),
	"content" text NOT NULL,
	"content_type" varchar(30) DEFAULT 'text',
	"attachments" jsonb,
	"is_private" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'sent',
	"chatwoot_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"synced_at" timestamp DEFAULT now(),
	CONSTRAINT "messages_chatwoot_message_id_unique" UNIQUE("chatwoot_message_id")
);
--> statement-breakpoint
ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_assignment_conversation" ON "agent_assignments" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "IDX_assignment_team_member" ON "agent_assignments" USING btree ("team_member_id");--> statement-breakpoint
CREATE INDEX "IDX_contact_chatwoot_id" ON "contacts" USING btree ("chatwoot_contact_id");--> statement-breakpoint
CREATE INDEX "IDX_contact_email" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "IDX_contact_phone" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "IDX_conversation_chatwoot_id" ON "conversations" USING btree ("chatwoot_conversation_id");--> statement-breakpoint
CREATE INDEX "IDX_conversation_status" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_conversation_channel" ON "conversations" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "IDX_conversation_synced" ON "conversations" USING btree ("synced_at");--> statement-breakpoint
CREATE INDEX "IDX_email_team_member" ON "email_accounts" USING btree ("team_member_id");--> statement-breakpoint
CREATE INDEX "IDX_email_provider" ON "email_accounts" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "IDX_message_conversation" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "IDX_message_chatwoot_id" ON "messages" USING btree ("chatwoot_message_id");--> statement-breakpoint
CREATE INDEX "IDX_message_created" ON "messages" USING btree ("created_at");