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
  lastLoginAt: timestamp("last_login_at"),
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
  platform: varchar("platform", { length: 50 }).notNull(), // metabase, chatwoot, typebot, mailcow
  platformUserId: varchar("platform_user_id"), // ID from the external platform
  role: varchar("role", { length: 50 }), // admin, agent, viewer, etc.
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
  adminId: varchar("admin_id").notNull().references(() => users.id),
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
