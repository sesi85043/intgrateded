/**
 * @fileoverview Storage layer - Database operations using Drizzle ORM
 * Copyright (c) 2025 DevPulse.Inc
 * Designed for MM ALL ELECTRONICS
 *
 * Description: Database access helpers and queries used across the server.
 */
// Storage layer - Database operations using Drizzle ORM
import {
  users,
  departments,
  teamMembers,
  teams,
  teamMemberTeams,
  serviceConfigs,
  managedUsers,
  activityLogs,
  analyticsMetrics,
  roles,
  permissions,
  rolePermissions,
  tasks,
  taskAssignments,
  taskHistory,
  worklogs,
  pendingRegistrations,
  approvalOtps,
  adminNotifications,
  chatwootAgents,
  type User,
  type UpsertUser,
  type Department,
  type InsertDepartment,
  type TeamMember,
  type InsertTeamMember,
  type Team,
  type InsertTeam,
  type TeamMemberTeam,
  type ServiceConfig,
  type InsertServiceConfig,
  type ManagedUser,
  type InsertManagedUser,
  type ActivityLog,
  type AnalyticsMetric,
  type Role,
  type InsertRole,
  type Permission,
  type Task,
  type InsertTask,
  type TaskAssignment,
  type TaskHistory,
  type Worklog,
  type InsertWorklog,
  type PendingRegistration,
  type InsertPendingRegistration,
  type ApprovalOtp,
  type AdminNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, or, inArray, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db"; // Import the pool we created in db.ts
const PostgresStore = connectPg(session);

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Role operations
  getAllRoles(): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  getRoleByCode(code: string): Promise<Role | undefined>;

  // Permission operations
  getAllPermissions(): Promise<Permission[]>;
  getPermissionsByRole(roleId: string): Promise<Permission[]>;

  // Department operations
  getAllDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartmentByCode(code: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  // Team Member operations
  getAllTeamMembers(): Promise<TeamMember[]>;
  getTeamMembersByDepartment(departmentId: string): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  getTeamMemberByEmail(email: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<void>;

  // Task operations
  getAllTasks(): Promise<Task[]>;
  getTasksByDepartment(departmentId: string): Promise<Task[]>;
  getTasksByAssignee(teamMemberId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Task assignment operations
  getTaskAssignments(taskId: string): Promise<TaskAssignment[]>;
  assignTask(taskId: string, teamMemberId: string, assignedById: string): Promise<TaskAssignment>;
  unassignTask(assignmentId: string): Promise<void>;

  // Task history operations
  createTaskHistory(taskId: string, changedById: string, action: string, previousValue?: any, newValue?: any, notes?: string): Promise<TaskHistory>;
  getTaskHistory(taskId: string): Promise<TaskHistory[]>;

  // Worklog operations
  createWorklog(worklog: InsertWorklog): Promise<Worklog>;
  getWorklogsByTask(taskId: string): Promise<Worklog[]>;
  getWorklogsByTeamMember(teamMemberId: string): Promise<Worklog[]>;

  // Service configuration operations
  getAllServices(): Promise<ServiceConfig[]>;
  getServiceByName(serviceName: string): Promise<ServiceConfig | undefined>;
  createService(service: InsertServiceConfig): Promise<ServiceConfig>;
  updateService(id: string, service: Partial<InsertServiceConfig>): Promise<ServiceConfig>;
  deleteService(id: string): Promise<void>;

  // Managed user operations
  getAllManagedUsers(): Promise<ManagedUser[]>;
  getManagedUser(id: string): Promise<ManagedUser | undefined>;
  createManagedUser(user: InsertManagedUser): Promise<ManagedUser>;
  updateManagedUser(id: string, user: Partial<InsertManagedUser>): Promise<ManagedUser>;
  deleteManagedUser(id: string): Promise<void>;

  // Activity log operations
  createActivityLog(
    adminId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    platform?: string,
    details?: any
  ): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getRecentActivityLogs(): Promise<ActivityLog[]>;

  // Analytics operations
  getAnalyticsMetrics(): Promise<any>;
  getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalActivities: number;
    servicesEnabled: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Role operations
  async getAllRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(roles.level);
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async getRoleByCode(code: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.code, code));
    return role;
  }

  // Permission operations
  async getAllPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions).orderBy(permissions.category, permissions.name);
  }

  async getPermissionsByRole(roleId: string): Promise<Permission[]> {
    return await db
      .select({
        id: permissions.id,
        name: permissions.name,
        code: permissions.code,
        description: permissions.description,
        category: permissions.category,
        createdAt: permissions.createdAt,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
  }

  // Department operations
  async getAllDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(departments.name);
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [dept] = await db.select().from(departments).where(eq(departments.id, id));
    return dept;
  }

  async getDepartmentByCode(code: string): Promise<Department | undefined> {
    const [dept] = await db.select().from(departments).where(eq(departments.code, code));
    return dept;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [created] = await db.insert(departments).values(department).returning();
    return created;
  }

  async updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department> {
    const [updated] = await db
      .update(departments)
      .set({ ...department, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updated;
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // Team Member operations
  async getAllTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
  }

  async getTeamMembersByDepartment(departmentId: string): Promise<TeamMember[]> {
    return await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.departmentId, departmentId))
      .orderBy(teamMembers.lastName);
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async getTeamMemberByEmail(email: string): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.email, email));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values(member).returning();
    return created;
  }

  async updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [updated] = await db
      .update(teamMembers)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return updated;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Service configuration operations
  async getAllServices(): Promise<ServiceConfig[]> {
    return await db.select().from(serviceConfigs).orderBy(serviceConfigs.serviceName);
  }

  async getServiceByName(serviceName: string): Promise<ServiceConfig | undefined> {
    const [service] = await db
      .select()
      .from(serviceConfigs)
      .where(eq(serviceConfigs.serviceName, serviceName));
    return service;
  }

  async createService(service: InsertServiceConfig): Promise<ServiceConfig> {
    const [created] = await db.insert(serviceConfigs).values(service).returning();
    return created;
  }

  async updateService(id: string, service: Partial<InsertServiceConfig>): Promise<ServiceConfig> {
    const [updated] = await db
      .update(serviceConfigs)
      .set({ ...service, updatedAt: new Date() })
      .where(eq(serviceConfigs.id, id))
      .returning();
    return updated;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(serviceConfigs).where(eq(serviceConfigs.id, id));
  }

  // Managed user operations
  async getAllManagedUsers(): Promise<ManagedUser[]> {
    return await db.select().from(managedUsers).orderBy(desc(managedUsers.createdAt));
  }

  async getManagedUser(id: string): Promise<ManagedUser | undefined> {
    const [user] = await db.select().from(managedUsers).where(eq(managedUsers.id, id));
    return user;
  }

  async createManagedUser(user: InsertManagedUser): Promise<ManagedUser> {
    const [created] = await db.insert(managedUsers).values(user).returning();
    return created;
  }

  async getManagedUserByTeamMemberId(teamMemberId: string): Promise<ManagedUser | undefined> {
    const [user] = await db.select().from(managedUsers).where(eq(managedUsers.teamMemberId, teamMemberId));
    return user;
  }

  async upsertManagedUserForTeamMember(teamMemberId: string, payload: Partial<InsertManagedUser>): Promise<ManagedUser> {
    const existing = await this.getManagedUserByTeamMemberId(teamMemberId);
    if (existing) {
      const updated = await this.updateManagedUser(existing.id, { ...payload });
      return updated;
    }
    const created = await this.createManagedUser({
      email: (payload as any).email || '',
      fullName: (payload as any).fullName || '',
      platforms: (payload as any).platforms || [],
      platformUserIds: (payload as any).platformUserIds || {},
      roles: (payload as any).roles || {},
      status: (payload as any).status || 'active',
      teamMemberId,
    } as InsertManagedUser);
    return created;
  }

  async updateManagedUser(id: string, user: Partial<InsertManagedUser>): Promise<ManagedUser> {
    const [updated] = await db
      .update(managedUsers)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(managedUsers.id, id))
      .returning();
    return updated;
  }

  async deleteManagedUser(id: string): Promise<void> {
    await db.delete(managedUsers).where(eq(managedUsers.id, id));
  }

  // Activity log operations
  async createActivityLog(
    adminId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    platform?: string,
    details?: any
  ): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values({
        adminId,
        action,
        targetType,
        targetId,
        platform,
        details,
      })
      .returning();
    return log;
  }

  async getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getRecentActivityLogs(): Promise<ActivityLog[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await db
      .select()
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, oneDayAgo))
      .orderBy(desc(activityLogs.createdAt))
      .limit(10);
  }

  // Analytics operations
  async getAnalyticsMetrics(): Promise<any> {
    const usersByPlatform = await db
      .select({
        platforms: managedUsers.platforms,
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${managedUsers.status} = 'active')::int`,
      })
      .from(managedUsers)
      .groupBy(managedUsers.platforms);

    const metrics: any = {
      metabase: { users: 0, active: 0 },
      chatwoot: { users: 0, active: 0 },
      typebot: { users: 0, active: 0 },
      mailcow: { users: 0, active: 0 },
    };

    usersByPlatform.forEach((row) => {
      if (row.platforms && Array.isArray(row.platforms)) {
        row.platforms.forEach((platform) => {
          if (metrics[platform]) {
            metrics[platform].users += row.total;
            metrics[platform].active += row.active;
          }
        });
      }
    });

    return metrics;
  }

  async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalActivities: number;
    servicesEnabled: number;
  }> {
    const [userStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${managedUsers.status} = 'active')::int`,
      })
      .from(managedUsers);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activityStats] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, oneDayAgo));

    const [serviceStats] = await db
      .select({
        enabled: sql<number>`count(*) filter (where ${serviceConfigs.enabled} = true)::int`,
      })
      .from(serviceConfigs);

    return {
      totalUsers: userStats?.total || 0,
      activeUsers: userStats?.active || 0,
      totalActivities: activityStats?.count || 0,
      servicesEnabled: serviceStats?.enabled || 0,
    };
  }

  // Task operations
  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTasksByDepartment(departmentId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.departmentId, departmentId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByAssignee(teamMemberId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedToId, teamMemberId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task> {
    const [updated] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Task assignment operations
  async getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
    return await db
      .select()
      .from(taskAssignments)
      .where(and(eq(taskAssignments.taskId, taskId), eq(taskAssignments.isActive, true)));
  }

  async assignTask(taskId: string, teamMemberId: string, assignedById: string): Promise<TaskAssignment> {
    const [assignment] = await db
      .insert(taskAssignments)
      .values({
        taskId,
        teamMemberId,
        assignedById,
        isActive: true,
      })
      .returning();
    return assignment;
  }

  async unassignTask(assignmentId: string): Promise<void> {
    await db
      .update(taskAssignments)
      .set({ isActive: false, unassignedAt: new Date() })
      .where(eq(taskAssignments.id, assignmentId));
  }

  // Task history operations
  async createTaskHistory(
    taskId: string,
    changedById: string,
    action: string,
    previousValue?: any,
    newValue?: any,
    notes?: string
  ): Promise<TaskHistory> {
    const [history] = await db
      .insert(taskHistory)
      .values({
        taskId,
        changedById,
        action,
        previousValue,
        newValue,
        notes,
      })
      .returning();
    return history;
  }

  async getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    return await db
      .select()
      .from(taskHistory)
      .where(eq(taskHistory.taskId, taskId))
      .orderBy(desc(taskHistory.createdAt));
  }

  // Worklog operations
  async createWorklog(worklog: InsertWorklog): Promise<Worklog> {
    const [created] = await db.insert(worklogs).values(worklog).returning();
    return created;
  }

  async getWorklogsByTask(taskId: string): Promise<Worklog[]> {
    return await db
      .select()
      .from(worklogs)
      .where(eq(worklogs.taskId, taskId))
      .orderBy(desc(worklogs.createdAt));
  }

  async getWorklogsByTeamMember(teamMemberId: string): Promise<Worklog[]> {
    return await db
      .select()
      .from(worklogs)
      .where(eq(worklogs.teamMemberId, teamMemberId))
      .orderBy(desc(worklogs.createdAt));
  }

  // Pending Registration operations
  async createPendingRegistration(registration: InsertPendingRegistration): Promise<PendingRegistration> {
    const [created] = await db.insert(pendingRegistrations).values(registration).returning();
    return created;
  }

  async getPendingRegistration(id: string): Promise<PendingRegistration | undefined> {
    const [registration] = await db.select().from(pendingRegistrations).where(eq(pendingRegistrations.id, id));
    return registration;
  }

  async getPendingRegistrationByEmail(email: string): Promise<PendingRegistration | undefined> {
    const [registration] = await db.select().from(pendingRegistrations).where(eq(pendingRegistrations.email, email));
    return registration;
  }

  async getAllPendingRegistrations(status?: string): Promise<PendingRegistration[]> {
    if (status) {
      return await db
        .select()
        .from(pendingRegistrations)
        .where(eq(pendingRegistrations.status, status))
        .orderBy(desc(pendingRegistrations.createdAt));
    }
    return await db.select().from(pendingRegistrations).orderBy(desc(pendingRegistrations.createdAt));
  }

  async updatePendingRegistration(id: string, data: Partial<PendingRegistration>): Promise<PendingRegistration> {
    const [updated] = await db
      .update(pendingRegistrations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pendingRegistrations.id, id))
      .returning();
    return updated;
  }

  async deletePendingRegistration(id: string): Promise<void> {
    await db.delete(pendingRegistrations).where(eq(pendingRegistrations.id, id));
  }

  // Approval OTP operations
  async createApprovalOtp(registrationId: string, otpCode: string, expiresAt: Date): Promise<ApprovalOtp> {
    const [created] = await db
      .insert(approvalOtps)
      .values({
        registrationId,
        otpCode,
        expiresAt,
      })
      .returning();
    return created;
  }

  async getValidApprovalOtp(registrationId: string, otpCode: string): Promise<ApprovalOtp | undefined> {
    const [otp] = await db
      .select()
      .from(approvalOtps)
      .where(
        and(
          eq(approvalOtps.registrationId, registrationId),
          eq(approvalOtps.otpCode, otpCode),
          eq(approvalOtps.isUsed, false),
          gte(approvalOtps.expiresAt, new Date())
        )
      );
    return otp;
  }

  async getLatestOtpForRegistration(registrationId: string): Promise<ApprovalOtp | undefined> {
    const [otp] = await db
      .select()
      .from(approvalOtps)
      .where(eq(approvalOtps.registrationId, registrationId))
      .orderBy(desc(approvalOtps.createdAt))
      .limit(1);
    return otp;
  }

  async getAllApprovalOtps(registrationId: string): Promise<ApprovalOtp[]> {
    return await db
      .select()
      .from(approvalOtps)
      .where(eq(approvalOtps.registrationId, registrationId));
  }

  async markOtpAsUsed(otpId: string, usedById: string): Promise<void> {
    await db
      .update(approvalOtps)
      .set({ isUsed: true, usedAt: new Date(), usedById })
      .where(eq(approvalOtps.id, otpId));
  }

  async invalidateExpiredOtps(): Promise<void> {
    await db
      .update(approvalOtps)
      .set({ isUsed: true })
      .where(and(eq(approvalOtps.isUsed, false), lte(approvalOtps.expiresAt, new Date())));
  }

  // Admin Notification operations
  async createAdminNotification(
    type: string,
    title: string,
    message: string,
    targetRoleLevel: number = 3,
    relatedEntityType?: string,
    relatedEntityId?: string,
    metadata?: any
  ): Promise<AdminNotification> {
    const [notification] = await db
      .insert(adminNotifications)
      .values({
        type,
        title,
        message,
        targetRoleLevel,
        relatedEntityType,
        relatedEntityId,
        metadata,
      })
      .returning();
    return notification;
  }

  async getUnreadNotifications(roleLevel: number): Promise<AdminNotification[]> {
    return await db
      .select()
      .from(adminNotifications)
      .where(and(eq(adminNotifications.isRead, false), lte(adminNotifications.targetRoleLevel, roleLevel)))
      .orderBy(desc(adminNotifications.createdAt));
  }

  async getAllNotifications(roleLevel: number, limit: number = 50): Promise<AdminNotification[]> {
    return await db
      .select()
      .from(adminNotifications)
      .where(lte(adminNotifications.targetRoleLevel, roleLevel))
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit);
  }

  async markNotificationAsRead(id: string, readById: string): Promise<void> {
    await db
      .update(adminNotifications)
      .set({ isRead: true, readAt: new Date(), readById })
      .where(eq(adminNotifications.id, id));
  }

  async markAllNotificationsAsRead(readById: string, roleLevel: number): Promise<void> {
    await db
      .update(adminNotifications)
      .set({ isRead: true, readAt: new Date(), readById })
      .where(and(eq(adminNotifications.isRead, false), lte(adminNotifications.targetRoleLevel, roleLevel)));
  }

  async getPendingRegistrationCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.status, 'pending'));
    return result?.count || 0;
  }

  // ============================================
  // TEAM OPERATIONS - Tiered Support Architecture
  // ============================================

  // Get all teams
  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(teams.name);
  }

  // Get team by ID
  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  // Get team by code
  async getTeamByCode(code: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.code, code));
    return team;
  }

  // Create a new team
  async createTeam(team: InsertTeam): Promise<Team> {
    const [created] = await db.insert(teams).values(team).returning();
    return created;
  }

  // Update a team
  async updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team> {
    const [updated] = await db
      .update(teams)
      .set({ ...team, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return updated;
  }

  // Delete a team
  async deleteTeam(id: string): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  // Get teams for a specific team member (many-to-many)
  async getTeamsForMember(teamMemberId: string): Promise<Team[]> {
    return await db
      .select({
        id: teams.id,
        name: teams.name,
        code: teams.code,
        description: teams.description,
        teamType: teams.teamType,
        departmentId: teams.departmentId,
        chatwootTeamId: teams.chatwootTeamId,
        chatwootInboxId: teams.chatwootInboxId,
        emailAddress: teams.emailAddress,
        isDefault: teams.isDefault,
        status: teams.status,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teamMemberTeams)
      .innerJoin(teams, eq(teamMemberTeams.teamId, teams.id))
      .where(and(eq(teamMemberTeams.teamMemberId, teamMemberId), eq(teamMemberTeams.isActive, true)));
  }

  // Get team IDs for a member (for filtering messages)
  async getTeamIdsForMember(teamMemberId: string): Promise<string[]> {
    const memberTeams = await db
      .select({ teamId: teamMemberTeams.teamId })
      .from(teamMemberTeams)
      .where(and(eq(teamMemberTeams.teamMemberId, teamMemberId), eq(teamMemberTeams.isActive, true)));
    return memberTeams.map(t => t.teamId);
  }

  // Get team members for a specific team
  async getMembersInTeam(teamId: string): Promise<TeamMember[]> {
    return await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        departmentId: teamMembers.departmentId,
        roleId: teamMembers.roleId,
        employeeId: teamMembers.employeeId,
        email: teamMembers.email,
        firstName: teamMembers.firstName,
        lastName: teamMembers.lastName,
        role: teamMembers.role,
        passwordHash: teamMembers.passwordHash,
        phone: teamMembers.phone,
        status: teamMembers.status,
        isVerified: teamMembers.isVerified,
        lastLoginAt: teamMembers.lastLoginAt,
        addressLine1: teamMembers.addressLine1,
        addressLine2: teamMembers.addressLine2,
        city: teamMembers.city,
        state: teamMembers.state,
        postalCode: teamMembers.postalCode,
        country: teamMembers.country,
        nextOfKin1Name: teamMembers.nextOfKin1Name,
        nextOfKin1Relationship: teamMembers.nextOfKin1Relationship,
        nextOfKin1Phone: teamMembers.nextOfKin1Phone,
        nextOfKin1Email: teamMembers.nextOfKin1Email,
        nextOfKin1Address: teamMembers.nextOfKin1Address,
        nextOfKin2Name: teamMembers.nextOfKin2Name,
        nextOfKin2Relationship: teamMembers.nextOfKin2Relationship,
        nextOfKin2Phone: teamMembers.nextOfKin2Phone,
        nextOfKin2Email: teamMembers.nextOfKin2Email,
        nextOfKin2Address: teamMembers.nextOfKin2Address,
        createdAt: teamMembers.createdAt,
        updatedAt: teamMembers.updatedAt,
      })
      .from(teamMemberTeams)
      .innerJoin(teamMembers, eq(teamMemberTeams.teamMemberId, teamMembers.id))
      .where(and(eq(teamMemberTeams.teamId, teamId), eq(teamMemberTeams.isActive, true)));
  }

  // Add a team member to a team (upsert to prevent duplicates)
  async addMemberToTeam(teamMemberId: string, teamId: string, addedById?: string): Promise<TeamMemberTeam> {
    // Check if membership exists (including inactive)
    const [existing] = await db
      .select()
      .from(teamMemberTeams)
      .where(and(eq(teamMemberTeams.teamMemberId, teamMemberId), eq(teamMemberTeams.teamId, teamId)));
    
    if (existing) {
      // Reactivate if inactive
      if (!existing.isActive) {
        const [updated] = await db
          .update(teamMemberTeams)
          .set({ isActive: true, addedAt: new Date(), addedById })
          .where(eq(teamMemberTeams.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }
    
    // Create new membership
    const [membership] = await db
      .insert(teamMemberTeams)
      .values({
        teamMemberId,
        teamId,
        addedById,
        isActive: true,
      })
      .returning();
    return membership;
  }

  // Remove a team member from a team (soft delete)
  async removeMemberFromTeam(teamMemberId: string, teamId: string): Promise<void> {
    await db
      .update(teamMemberTeams)
      .set({ isActive: false })
      .where(and(eq(teamMemberTeams.teamMemberId, teamMemberId), eq(teamMemberTeams.teamId, teamId)));
  }

  // Check if member is in team
  async isMemberInTeam(teamMemberId: string, teamId: string): Promise<boolean> {
    const [result] = await db
      .select({ id: teamMemberTeams.id })
      .from(teamMemberTeams)
      .where(
        and(
          eq(teamMemberTeams.teamMemberId, teamMemberId),
          eq(teamMemberTeams.teamId, teamId),
          eq(teamMemberTeams.isActive, true)
        )
      );
    return !!result;
  }

  // Get default teams (teams that new members auto-join)
  async getDefaultTeams(): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.isDefault, true));
  }

  // Auto-join new member to default teams
  async autoJoinDefaultTeams(memberId: string): Promise<void> {
    const defaultTeams = await this.getDefaultTeams();
    for (const team of defaultTeams) {
      await this.addMemberToTeam(teamMemberId, team.id);
    }
  }

  // Get teams by department (for department-specific routing)
  async getTeamsByDepartment(departmentId: string): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.departmentId, departmentId));
  }

  // Create a mapping between team member and Chatwoot agent
  async createChatwootAgent(teamMemberId: string, chatwootAgentId: number, chatwootAgentEmail?: string): Promise<any> {
    const [result] = await db
      .insert(chatwootAgents)
      .values({
        teamMemberId,
        chatwootAgentId,
        chatwootAgentEmail: chatwootAgentEmail || undefined,
        isActive: true,
      })
      .returning();
    return result;
  }
}

// Initialize the Postgres session store with error handling
let sessionStore: any;
try {
  sessionStore = new PostgresStore({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true,
  });
  console.log('[storage] PostgreSQL session store initialized successfully');
} catch (err) {
  console.error('[storage] Failed to initialize PostgreSQL session store:', err);

  // In production we want to fail fast so operators notice and fix the session store
  // rather than silently falling back to an in-memory store which loses sessions.
  if (process.env.NODE_ENV === 'production') {
    console.error('[storage] Running in production and session store failed. Exiting process to avoid unsafe in-memory sessions.');
    // Exit with non-zero code so the container/orchestrator can restart and alert
    process.exit(1);
  }

  // Non-production fallback: use express-session MemoryStore synchronously so
  // the application can still run in development or staging environments.
  console.warn('[storage] Using fallback MemoryStore for sessions (development only)');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  sessionStore = new session.MemoryStore();
}

export { sessionStore };
export const storage = new DatabaseStorage();
