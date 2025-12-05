import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Role types for the system
export const ROLE_TYPES = {
  TECHNICIAN: 'technician',
  DEPARTMENT_ADMIN: 'department_admin',
  MANAGEMENT: 'management',
} as const;

export type RoleType = typeof ROLE_TYPES[keyof typeof ROLE_TYPES];

// Permission types for granular access control
export const PERMISSION_TYPES = {
  VIEW_TASKS: 'view_tasks',
  CREATE_TASK: 'create_task',
  UPDATE_TASK: 'update_task',
  DELETE_TASK: 'delete_task',
  ASSIGN_TASK: 'assign_task',
  VIEW_OWN_DEPARTMENT: 'view_own_department',
  VIEW_ALL_DEPARTMENTS: 'view_all_departments',
  VIEW_DEPARTMENT_DASHBOARD: 'view_department_dashboard',
  VIEW_GLOBAL_DASHBOARD: 'view_global_dashboard',
  MANAGE_DEPARTMENT_USERS: 'manage_department_users',
  MANAGE_GLOBAL_USERS: 'manage_global_users',
  VIEW_DEPARTMENT_LOGS: 'view_department_logs',
  VIEW_ALL_LOGS: 'view_all_logs',
  MANAGE_SERVICE_CONFIG: 'manage_service_config',
  VIEW_ANALYTICS: 'view_analytics',
  SUBMIT_WORKLOG: 'submit_worklog',
} as const;

export type PermissionType = typeof PERMISSION_TYPES[keyof typeof PERMISSION_TYPES];

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Roles table - RBAC role definitions
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(),
  code: varchar("code", { length: 30 }).notNull().unique(), // technician, department_admin, management
  description: text("description"),
  level: integer("level").notNull().default(1), // 1=technician, 2=dept_admin, 3=management
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Permissions table - Granular action permissions
export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  code: varchar("code", { length: 50 }).notNull().unique(), // view_tasks, manage_global_users, etc.
  description: text("description"),
  category: varchar("category", { length: 50 }), // tasks, users, dashboard, settings
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

// Role-Permissions junction table - Many-to-many relationship
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: varchar("permission_id").notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;

// Departments table - Company organizational structure
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(),
  code: varchar("code", { length: 10 }).notNull().unique(), // HA, DTV, HHP
  description: text("description"),
  status: varchar("status", { length: 20 }).default('active').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// Team Members table - Company employees with department assignments and RBAC
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  departmentId: varchar("department_id").notNull().references(() => departments.id),
  roleId: varchar("role_id").references(() => roles.id),
  employeeId: varchar("employee_id").unique(),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  role: varchar("role", { length: 50 }).notNull(), // legacy field: admin, technician
  passwordHash: text("password_hash"), // For local auth
  phone: varchar("phone", { length: 20 }),
  status: varchar("status", { length: 20 }).default('active').notNull(),
  isVerified: boolean("is_verified").default(false).notNull(), // Admin approval flag for new signups
  lastLoginAt: timestamp("last_login_at"),
  
  // Residential Address
  addressLine1: varchar("address_line_1", { length: 255 }),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  
  // Next of Kin 1
  nextOfKin1Name: varchar("next_of_kin_1_name", { length: 100 }),
  nextOfKin1Relationship: varchar("next_of_kin_1_relationship", { length: 50 }),
  nextOfKin1Phone: varchar("next_of_kin_1_phone", { length: 20 }),
  nextOfKin1Email: varchar("next_of_kin_1_email"),
  nextOfKin1Address: text("next_of_kin_1_address"),
  
  // Next of Kin 2
  nextOfKin2Name: varchar("next_of_kin_2_name", { length: 100 }),
  nextOfKin2Relationship: varchar("next_of_kin_2_relationship", { length: 50 }),
  nextOfKin2Phone: varchar("next_of_kin_2_phone", { length: 20 }),
  nextOfKin2Email: varchar("next_of_kin_2_email"),
  nextOfKin2Address: text("next_of_kin_2_address"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// Service configurations for external platforms
export const serviceConfigs = pgTable("service_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceName: varchar("service_name", { length: 50 }).notNull().unique(), // metabase, chatwoot, typebot, mailcow
  apiUrl: text("api_url").notNull(),
  apiKey: text("api_key").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceConfigSchema = createInsertSchema(serviceConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export type InsertServiceConfig = z.infer<typeof insertServiceConfigSchema>;
export type ServiceConfig = typeof serviceConfigs.$inferSelect;

// Managed users across platforms
export const managedUsers = pgTable("managed_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  fullName: varchar("full_name").notNull(),
  teamMemberId: varchar("team_member_id").references(() => teamMembers.id),
  platforms: varchar("platforms", { length: 50 }).array().default(sql`ARRAY[]::varchar[]`).notNull(), // array of platforms: metabase, chatwoot, typebot, mailcow
  platformUserIds: jsonb("platform_user_ids").default(sql`'{}'::jsonb`).notNull(), // JSON mapping of platform names to their user IDs
  roles: jsonb("roles").default(sql`'{}'::jsonb`).notNull(), // JSON mapping of platform names to their roles
  status: varchar("status", { length: 20 }).default('active').notNull(), // active, inactive, suspended
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertManagedUserSchema = createInsertSchema(managedUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManagedUser = z.infer<typeof insertManagedUserSchema>;
export type ManagedUser = typeof managedUsers.$inferSelect;

// Activity logs for audit trail
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => teamMembers.id),
  action: varchar("action", { length: 100 }).notNull(), // created_user, deleted_user, updated_config, etc.
  targetType: varchar("target_type", { length: 50 }), // user, config, etc.
  targetId: varchar("target_id"),
  platform: varchar("platform", { length: 50 }), // metabase, chatwoot, typebot, mailcow
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;

// Analytics metrics cache
export const analyticsMetrics = pgTable("analytics_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 50 }).notNull(), // metabase, chatwoot, typebot, mailcow
  metricType: varchar("metric_type", { length: 100 }).notNull(), // conversations_count, form_submissions, active_users, etc.
  metricValue: integer("metric_value").notNull(),
  metricData: jsonb("metric_data"), // Additional metric details
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;

// Task status types
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

// Task priority types
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type TaskPriority = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY];

// Tasks table - Technician job/task management
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  departmentId: varchar("department_id").notNull().references(() => departments.id),
  createdById: varchar("created_by_id").notNull().references(() => teamMembers.id),
  assignedToId: varchar("assigned_to_id").references(() => teamMembers.id),
  status: varchar("status", { length: 30 }).notNull().default('pending'),
  priority: varchar("priority", { length: 20 }).notNull().default('medium'),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"), // Additional task data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Task assignments table - Track who is assigned to tasks
export const taskAssignments = pgTable("task_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  teamMemberId: varchar("team_member_id").notNull().references(() => teamMembers.id),
  assignedById: varchar("assigned_by_id").notNull().references(() => teamMembers.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  unassignedAt: timestamp("unassigned_at"),
  isActive: boolean("is_active").default(true).notNull(),
});

export type TaskAssignment = typeof taskAssignments.$inferSelect;

// Task history table - Audit trail for task changes
export const taskHistory = pgTable("task_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  changedById: varchar("changed_by_id").notNull().references(() => teamMembers.id),
  action: varchar("action", { length: 50 }).notNull(), // created, updated, assigned, status_changed, completed
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type TaskHistory = typeof taskHistory.$inferSelect;

// Worklogs table - Technician work time and notes
export const worklogs = pgTable("worklogs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  teamMemberId: varchar("team_member_id").notNull().references(() => teamMembers.id),
  hoursWorked: integer("hours_worked"),
  minutesWorked: integer("minutes_worked"),
  description: text("description"),
  workDate: timestamp("work_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorklogSchema = createInsertSchema(worklogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorklog = z.infer<typeof insertWorklogSchema>;
export type Worklog = typeof worklogs.$inferSelect;

// Registration status types
export const REGISTRATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type RegistrationStatus = typeof REGISTRATION_STATUS[keyof typeof REGISTRATION_STATUS];

// Pending Registrations table - Staff registration applications awaiting approval
export const pendingRegistrations = pgTable("pending_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  phone: varchar("phone", { length: 20 }),
  departmentId: varchar("department_id").notNull().references(() => departments.id),
  
  // Residential Address
  addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).notNull().default('Nigeria'),
  
  // Next of Kin 1
  nextOfKin1Name: varchar("next_of_kin_1_name", { length: 100 }).notNull(),
  nextOfKin1Relationship: varchar("next_of_kin_1_relationship", { length: 50 }).notNull(),
  nextOfKin1Phone: varchar("next_of_kin_1_phone", { length: 20 }).notNull(),
  nextOfKin1Email: varchar("next_of_kin_1_email"),
  nextOfKin1Address: text("next_of_kin_1_address"),
  
  // Next of Kin 2
  nextOfKin2Name: varchar("next_of_kin_2_name", { length: 100 }).notNull(),
  nextOfKin2Relationship: varchar("next_of_kin_2_relationship", { length: 50 }).notNull(),
  nextOfKin2Phone: varchar("next_of_kin_2_phone", { length: 20 }).notNull(),
  nextOfKin2Email: varchar("next_of_kin_2_email"),
  nextOfKin2Address: text("next_of_kin_2_address"),
  
  // Status and metadata
  status: varchar("status", { length: 20 }).default('pending').notNull(),
  rejectionReason: text("rejection_reason"),
  reviewedById: varchar("reviewed_by_id").references(() => teamMembers.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPendingRegistrationSchema = createInsertSchema(pendingRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedById: true,
  reviewedAt: true,
  status: true,
  rejectionReason: true,
});

export type InsertPendingRegistration = z.infer<typeof insertPendingRegistrationSchema>;
export type PendingRegistration = typeof pendingRegistrations.$inferSelect;

// Approval OTPs table - One-time passwords for registration approval
export const approvalOtps = pgTable("approval_otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  registrationId: varchar("registration_id").notNull().references(() => pendingRegistrations.id, { onDelete: 'cascade' }),
  otpCode: varchar("otp_code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  usedById: varchar("used_by_id").references(() => teamMembers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ApprovalOtp = typeof approvalOtps.$inferSelect;

// Admin Notifications table - Alerts for management about pending actions
export const adminNotifications = pgTable("admin_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // registration_pending, registration_approved, etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  targetRoleLevel: integer("target_role_level").default(3), // 3 = management by default
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // pending_registration, team_member, etc.
  relatedEntityId: varchar("related_entity_id"),
  isRead: boolean("is_read").default(false).notNull(),
  readById: varchar("read_by_id").references(() => teamMembers.id),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminNotification = typeof adminNotifications.$inferSelect;

// Extended team member fields schema for profile updates
export const extendedTeamMemberSchema = z.object({
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  nextOfKin1Name: z.string().min(1).optional(),
  nextOfKin1Relationship: z.string().min(1).optional(),
  nextOfKin1Phone: z.string().min(1).optional(),
  nextOfKin1Email: z.string().email().optional(),
  nextOfKin1Address: z.string().optional(),
  nextOfKin2Name: z.string().min(1).optional(),
  nextOfKin2Relationship: z.string().min(1).optional(),
  nextOfKin2Phone: z.string().min(1).optional(),
  nextOfKin2Email: z.string().email().optional(),
  nextOfKin2Address: z.string().optional(),
});

// Staff registration form validation schema
export const staffRegistrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  departmentId: z.string().min(1, "Department is required"),
  
  // Address
  addressLine1: z.string().min(1, "Street address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().default("Nigeria"),
  
  // Next of Kin 1
  nextOfKin1Name: z.string().min(1, "Next of kin name is required"),
  nextOfKin1Relationship: z.string().min(1, "Relationship is required"),
  nextOfKin1Phone: z.string().min(10, "Valid phone number required"),
  nextOfKin1Email: z.string().email().optional().or(z.literal("")),
  nextOfKin1Address: z.string().optional(),
  
  // Next of Kin 2
  nextOfKin2Name: z.string().min(1, "Second next of kin name is required"),
  nextOfKin2Relationship: z.string().min(1, "Relationship is required"),
  nextOfKin2Phone: z.string().min(10, "Valid phone number required"),
  nextOfKin2Email: z.string().email().optional().or(z.literal("")),
  nextOfKin2Address: z.string().optional(),
  
  // CAPTCHA token
  captchaToken: z.string().min(1, "Please verify you are human"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ============================================
// COMMUNICATION INTEGRATION TABLES
// ============================================

// Chatwoot Configuration - Stores Chatwoot instance settings
export const chatwootConfig = pgTable("chatwoot_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceUrl: text("instance_url").notNull(),
  apiAccessToken: text("api_access_token").notNull(),
  accountId: integer("account_id").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  ssoEnabled: boolean("sso_enabled").default(false).notNull(),
  webhookSecret: text("webhook_secret"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatwootConfigSchema = createInsertSchema(chatwootConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export type InsertChatwootConfig = z.infer<typeof insertChatwootConfigSchema>;
export type ChatwootConfig = typeof chatwootConfig.$inferSelect;

// Chatwoot Teams - Maps Chatwoot teams to departments
export const chatwootTeams = pgTable("chatwoot_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: 'cascade' }),
  chatwootTeamId: integer("chatwoot_team_id").notNull(),
  chatwootTeamName: varchar("chatwoot_team_name", { length: 100 }).notNull(),
  autoAssign: boolean("auto_assign").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatwootTeamSchema = createInsertSchema(chatwootTeams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChatwootTeam = z.infer<typeof insertChatwootTeamSchema>;
export type ChatwootTeam = typeof chatwootTeams.$inferSelect;

// Chatwoot Inboxes - Maps inboxes to departments
export const chatwootInboxes = pgTable("chatwoot_inboxes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: 'cascade' }),
  chatwootInboxId: integer("chatwoot_inbox_id").notNull(),
  chatwootInboxName: varchar("chatwoot_inbox_name", { length: 100 }).notNull(),
  inboxType: varchar("inbox_type", { length: 30 }).notNull(), // email, whatsapp, web
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatwootInboxSchema = createInsertSchema(chatwootInboxes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChatwootInbox = z.infer<typeof insertChatwootInboxSchema>;
export type ChatwootInbox = typeof chatwootInboxes.$inferSelect;

// Chatwoot Agent Mapping - Links team members to Chatwoot agents
export const chatwootAgents = pgTable("chatwoot_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamMemberId: varchar("team_member_id").notNull().references(() => teamMembers.id, { onDelete: 'cascade' }),
  chatwootAgentId: integer("chatwoot_agent_id").notNull(),
  chatwootAgentEmail: varchar("chatwoot_agent_email"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatwootAgentSchema = createInsertSchema(chatwootAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChatwootAgent = z.infer<typeof insertChatwootAgentSchema>;
export type ChatwootAgent = typeof chatwootAgents.$inferSelect;

// Evolution API Configuration - WhatsApp gateway settings
export const evolutionApiConfig = pgTable("evolution_api_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceUrl: text("instance_url").notNull(),
  apiKey: text("api_key").notNull(),
  instanceName: varchar("instance_name", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  webhookUrl: text("webhook_url"),
  qrCodeData: text("qr_code_data"),
  connectionStatus: varchar("connection_status", { length: 30 }).default('disconnected'), // connected, disconnected, connecting
  lastConnectedAt: timestamp("last_connected_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEvolutionApiConfigSchema = createInsertSchema(evolutionApiConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastConnectedAt: true,
  qrCodeData: true,
  connectionStatus: true,
});

export type InsertEvolutionApiConfig = z.infer<typeof insertEvolutionApiConfigSchema>;
export type EvolutionApiConfig = typeof evolutionApiConfig.$inferSelect;

// WhatsApp Numbers - Maps WhatsApp numbers to departments via Evolution API
export const whatsappNumbers = pgTable("whatsapp_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  evolutionConfigId: varchar("evolution_config_id").notNull().references(() => evolutionApiConfig.id, { onDelete: 'cascade' }),
  departmentId: varchar("department_id").references(() => departments.id),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  isDefault: boolean("is_default").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhatsappNumberSchema = createInsertSchema(whatsappNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWhatsappNumber = z.infer<typeof insertWhatsappNumberSchema>;
export type WhatsappNumber = typeof whatsappNumbers.$inferSelect;

// Typebot Configuration - Chatbot flow settings
export const typebotConfig = pgTable("typebot_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceUrl: text("instance_url").notNull(),
  apiToken: text("api_token").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTypebotConfigSchema = createInsertSchema(typebotConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTypebotConfig = z.infer<typeof insertTypebotConfigSchema>;
export type TypebotConfig = typeof typebotConfig.$inferSelect;

// Typebot Flows - Maps Typebot flows to departments for routing
export const typebotFlows = pgTable("typebot_flows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  typebotConfigId: varchar("typebot_config_id").notNull().references(() => typebotConfig.id, { onDelete: 'cascade' }),
  departmentId: varchar("department_id").references(() => departments.id),
  typebotId: varchar("typebot_id", { length: 100 }).notNull(),
  flowName: varchar("flow_name", { length: 100 }).notNull(),
  flowDescription: text("flow_description"),
  triggerKeywords: varchar("trigger_keywords", { length: 255 }).array().default(sql`ARRAY[]::varchar[]`),
  isMainMenu: boolean("is_main_menu").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTypebotFlowSchema = createInsertSchema(typebotFlows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTypebotFlow = z.infer<typeof insertTypebotFlowSchema>;
export type TypebotFlow = typeof typebotFlows.$inferSelect;

// Department Email Settings - Email configuration per department
export const departmentEmailSettings = pgTable("department_email_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: 'cascade' }).unique(),
  parentEmail: varchar("parent_email").notNull(), // e.g., support.dtv@company.com
  imapHost: varchar("imap_host", { length: 255 }),
  imapPort: integer("imap_port").default(993),
  imapUsername: varchar("imap_username"),
  imapPassword: text("imap_password"),
  imapUseSsl: boolean("imap_use_ssl").default(true).notNull(),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587),
  smtpUsername: varchar("smtp_username"),
  smtpPassword: text("smtp_password"),
  smtpUseTls: boolean("smtp_use_tls").default(true).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDepartmentEmailSettingsSchema = createInsertSchema(departmentEmailSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export type InsertDepartmentEmailSettings = z.infer<typeof insertDepartmentEmailSettingsSchema>;
export type DepartmentEmailSettings = typeof departmentEmailSettings.$inferSelect;

// Mailcow Configuration - Email server integration
export const mailcowConfig = pgTable("mailcow_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceUrl: text("instance_url").notNull(),
  apiKey: text("api_key").notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMailcowConfigSchema = createInsertSchema(mailcowConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export type InsertMailcowConfig = z.infer<typeof insertMailcowConfigSchema>;
export type MailcowConfig = typeof mailcowConfig.$inferSelect;

// Communication Channels - Unified view of all channels
export const CHANNEL_TYPES = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  WEB_CHAT: 'web_chat',
} as const;

export type ChannelType = typeof CHANNEL_TYPES[keyof typeof CHANNEL_TYPES];

// Conversation status types
export const CONVERSATION_STATUS = {
  OPEN: 'open',
  PENDING: 'pending',
  RESOLVED: 'resolved',
  SNOOZED: 'snoozed',
} as const;

export type ConversationStatus = typeof CONVERSATION_STATUS[keyof typeof CONVERSATION_STATUS];
