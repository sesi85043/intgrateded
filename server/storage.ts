// Storage layer - Database operations using Drizzle ORM
import {
  users,
  serviceConfigs,
  managedUsers,
  activityLogs,
  analyticsMetrics,
  type User,
  type UpsertUser,
  type ServiceConfig,
  type InsertServiceConfig,
  type ManagedUser,
  type InsertManagedUser,
  type ActivityLog,
  type AnalyticsMetric,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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
        platform: managedUsers.platform,
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${managedUsers.status} = 'active')::int`,
      })
      .from(managedUsers)
      .groupBy(managedUsers.platform);

    const metrics: any = {
      metabase: { users: 0, active: 0 },
      chatwoot: { users: 0, active: 0 },
      typebot: { users: 0, active: 0 },
      mailcow: { users: 0, active: 0 },
    };

    usersByPlatform.forEach((row) => {
      if (metrics[row.platform]) {
        metrics[row.platform] = {
          users: row.total,
          active: row.active,
        };
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
}

export const storage = new DatabaseStorage();
