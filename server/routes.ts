/**
 * @fileoverview API routes for Admin Hub
 * Copyright (c) 2025 DevPulse.Inc
 * Designed for MM ALL ELECTRONICS
 *
 * Description: Central Express route definitions for Admin Hub.
 */
// API routes for admin dashboard
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Using development auth for local testing
import { setupAuth, isAuthenticated, isTeamMemberAuthenticated } from "./devAuth";
import {
  insertServiceConfigSchema,
  insertManagedUserSchema,
  insertDepartmentSchema,
  insertTeamMemberSchema,
  insertTaskSchema,
  insertWorklogSchema,
  PERMISSION_TYPES,
  ROLE_TYPES,
} from "@shared/schema";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
}).strict();
import {
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireRoleOrHigher,
  requireDepartmentAccess,
  hasPermission,
  isRole,
  canAccessDepartment,
} from "./rbac";
import bcrypt from "bcryptjs";
import registerTeamManagedRoutes from './routes-team-managed';

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes - Update own profile
  app.get('/api/profile', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      const { passwordHash, ...memberWithoutPassword } = member;
      res.json(memberWithoutPassword);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch('/api/profile', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }
      
      const { firstName, lastName, phone, currentPassword, newPassword } = parsed.data;

      const updateData: any = {};
      const changedFields: string[] = [];
      
      if (firstName !== undefined && firstName !== member.firstName) {
        updateData.firstName = firstName;
        changedFields.push('firstName');
      }
      if (lastName !== undefined && lastName !== member.lastName) {
        updateData.lastName = lastName;
        changedFields.push('lastName');
      }
      if (phone !== undefined && phone !== member.phone) {
        updateData.phone = phone;
        changedFields.push('phone');
      }

      // Handle password change separately
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to change password" });
        }

        // Get full member with password hash
        const fullMember = await storage.getTeamMember(member.id);
        if (!fullMember?.passwordHash) {
          return res.status(400).json({ message: "Cannot change password - no password set" });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, fullMember.passwordHash);
        if (!isValidPassword) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }

        updateData.passwordHash = await bcrypt.hash(newPassword, 10);
        changedFields.push('password');
      }

      // Nothing to update
      if (Object.keys(updateData).length === 0) {
        const { passwordHash, ...memberWithoutPassword } = member;
        return res.json(memberWithoutPassword);
      }

      const updatedMember = await storage.updateTeamMember(member.id, updateData);

      await storage.createActivityLog(
        member.userId || member.id,
        "updated_own_profile",
        "team_member",
        member.id,
        undefined,
        { fields: changedFields }
      );

      const { passwordHash, ...memberWithoutPassword } = updatedMember;
      res.json(memberWithoutPassword);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(400).json({ message: "Failed to update profile" });
    }
  });

  // Department routes
  app.get('/api/departments', isAuthenticated, async (req: any, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post('/api/departments', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      
      await storage.createActivityLog(
        req.user.claims.sub,
        "created_department",
        "department",
        department.id
      );

      res.json(department);
    } catch (error) {
      console.error("Error creating department:", error instanceof Error ? error.message : error);
      const message = error instanceof Error ? error.message : "Failed to create department";
      res.status(400).json({ message, error: message });
    }
  });

  app.patch('/api/departments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, validatedData);
      
      await storage.createActivityLog(
        req.user.claims.sub,
        "updated_department",
        "department",
        id
      );

      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(400).json({ message: "Failed to update department" });
    }
  });

  app.delete('/api/departments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDepartment(id);
      
      await storage.createActivityLog(
        req.user.claims.sub,
        "deleted_department",
        "department",
        id
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(400).json({ message: "Failed to delete department" });
    }
  });

  // Team Member routes
  // Register routes for assigning managed platform access to existing team members
  registerTeamManagedRoutes(app, storage);

  app.get('/api/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const { departmentId } = req.query;
      const members = departmentId 
        ? await storage.getTeamMembersByDepartment(departmentId as string)
        : await storage.getAllTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post('/api/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTeamMemberSchema.parse(req.body);
      const member = await storage.createTeamMember(validatedData);
      
      await storage.createActivityLog(
        req.user.claims.sub,
        "created_team_member",
        "team_member",
        member.id,
        undefined,
        { employeeId: member.employeeId, role: member.role }
      );

      res.json(member);
    } catch (error) {
      console.error("Error creating team member:", error instanceof Error ? error.message : error);
      const message = error instanceof Error ? error.message : "Failed to create team member";
      res.status(400).json({ message, error: message });
    }
  });

  app.patch('/api/team-members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertTeamMemberSchema.partial().parse(req.body);
      const member = await storage.updateTeamMember(id, validatedData);
      
      await storage.createActivityLog(
        req.user.claims.sub,
        "updated_team_member",
        "team_member",
        id
      );

      res.json(member);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(400).json({ message: "Failed to update team member" });
    }
  });

  app.delete('/api/team-members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTeamMember(id);
      
      await storage.createActivityLog(
        req.user.claims.sub,
        "deleted_team_member",
        "team_member",
        id
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(400).json({ message: "Failed to delete team member" });
    }
  });

  // Service configuration routes
  app.get('/api/services', isAuthenticated, async (req: any, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post('/api/services', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertServiceConfigSchema.parse(req.body);
      
      // Check if service already exists
      const existing = await storage.getServiceByName(validatedData.serviceName);
      if (existing) {
        return res.status(400).json({ message: "Service already exists" });
      }

      const service = await storage.createService(validatedData);
      
      // Log activity
      await storage.createActivityLog(
        req.user.claims.sub,
        "created_service_config",
        "service_config",
        service.id,
        validatedData.serviceName
      );

      res.json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(400).json({ message: "Failed to create service" });
    }
  });

  app.patch('/api/services/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertServiceConfigSchema.partial().parse(req.body);
      
      const service = await storage.updateService(id, validatedData);
      
      // Log activity
      await storage.createActivityLog(
        req.user.claims.sub,
        "updated_service_config",
        "service_config",
        id,
        service.serviceName
      );

      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(400).json({ message: "Failed to update service" });
    }
  });

  app.delete('/api/services/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteService(id);
      
      // Log activity
      await storage.createActivityLog(
        req.user.claims.sub,
        "deleted_service_config",
        "service_config",
        id
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(400).json({ message: "Failed to delete service" });
    }
  });

  app.post('/api/services/:serviceName/test', isAuthenticated, async (req: any, res) => {
    try {
      const { serviceName } = req.params;
      
      // In a real implementation, this would test the actual API connection
      // For now, we'll just check if the service is configured
      const service = await storage.getServiceByName(serviceName);
      
      if (!service) {
        return res.status(404).json({ message: "Service not configured" });
      }

      if (!service.enabled) {
        return res.status(400).json({ message: "Service is disabled" });
      }

      // Log activity
      await storage.createActivityLog(
        req.user.claims.sub,
        "tested_service_connection",
        "service_config",
        service.id,
        serviceName
      );

      res.json({ success: true, message: "Connection test successful" });
    } catch (error) {
      console.error("Error testing service:", error);
      res.status(500).json({ message: "Connection test failed" });
    }
  });

  // Managed user routes
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllManagedUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertManagedUserSchema.parse(req.body);
      const user = await storage.createManagedUser(validatedData);
      
      // Log activity
      await storage.createActivityLog(
        req.user.claims.sub,
        "created_user",
        "managed_user",
        user.id,
        Array.isArray(validatedData.platforms) ? validatedData.platforms.join(", ") : "unknown",
        { email: validatedData.email, fullName: validatedData.fullName, platforms: validatedData.platforms }
      );

      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertManagedUserSchema.partial().parse(req.body);
      
      const user = await storage.updateManagedUser(id, validatedData);
      
      // Log activity
      await storage.createActivityLog(
        req.user.claims.sub,
        "updated_user",
        "managed_user",
        id,
        Array.isArray(user.platforms) ? user.platforms.join(", ") : "unknown",
        { email: user.email, platforms: user.platforms }
      );

      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getManagedUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteManagedUser(id);
      
      // Log activity
      await storage.createActivityLog(
        req.user.claims.sub,
        "deleted_user",
        "managed_user",
        id,
        user.platform,
        { email: user.email, fullName: user.fullName }
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: "Failed to delete user" });
    }
  });

  // Activity log routes
  app.get('/api/activity', isAuthenticated, async (req: any, res) => {
    try {
      const activities = await storage.getActivityLogs(100);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get('/api/activity/recent', isAuthenticated, async (req: any, res) => {
    try {
      const activities = await storage.getRecentActivityLogs();
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const metrics = await storage.getAnalyticsMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Dashboard stats route
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // RBAC Routes - Roles and Permissions
  app.get('/api/roles', isAuthenticated, async (req: any, res) => {
    try {
      const allRoles = await storage.getAllRoles();
      res.json(allRoles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.get('/api/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const allPermissions = await storage.getAllPermissions();
      res.json(allPermissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.get('/api/roles/:roleId/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const { roleId } = req.params;
      const rolePermissions = await storage.getPermissionsByRole(roleId);
      res.json(rolePermissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  // Task Routes
  app.get('/api/tasks', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      const { departmentId } = req.query;

      let taskList;
      
      if (isRole(member, ROLE_TYPES.MANAGEMENT) || hasPermission(member, PERMISSION_TYPES.VIEW_ALL_DEPARTMENTS)) {
        taskList = departmentId 
          ? await storage.getTasksByDepartment(departmentId as string)
          : await storage.getAllTasks();
      } else if (isRole(member, ROLE_TYPES.DEPARTMENT_ADMIN)) {
        taskList = await storage.getTasksByDepartment(member.departmentId);
      } else {
        taskList = await storage.getTasksByAssignee(member.id);
      }

      res.json(taskList);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const member = req.teamMember;
      if (!canAccessDepartment(member, task.departmentId)) {
        return res.status(403).json({ message: "Access denied to this task" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', isTeamMemberAuthenticated, requireAnyPermission(PERMISSION_TYPES.CREATE_TASK, PERMISSION_TYPES.ASSIGN_TASK), async (req: any, res) => {
    try {
      const member = req.teamMember;
      const validatedData = insertTaskSchema.parse({
        ...req.body,
        createdById: member.id,
        departmentId: req.body.departmentId || member.departmentId,
      });

      if (!canAccessDepartment(member, validatedData.departmentId)) {
        return res.status(403).json({ message: "Cannot create task in this department" });
      }

      const task = await storage.createTask(validatedData);

      await storage.createTaskHistory(task.id, member.id, "created", null, validatedData);

      await storage.createActivityLog(
        member.userId || member.id,
        "created_task",
        "task",
        task.id,
        undefined,
        { title: task.title, departmentId: task.departmentId }
      );

      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isTeamMemberAuthenticated, requirePermission(PERMISSION_TYPES.UPDATE_TASK), async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = req.teamMember;

      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!canAccessDepartment(member, existingTask.departmentId)) {
        return res.status(403).json({ message: "Access denied to this task" });
      }

      const validatedData = insertTaskSchema.partial().parse(req.body);
      
      if (validatedData.status === 'completed' && existingTask.status !== 'completed') {
        (validatedData as any).completedAt = new Date();
      }

      const task = await storage.updateTask(id, validatedData);

      await storage.createTaskHistory(task.id, member.id, "updated", existingTask, validatedData);

      await storage.createActivityLog(
        member.userId || member.id,
        "updated_task",
        "task",
        task.id,
        undefined,
        { title: task.title, changes: Object.keys(validatedData) }
      );

      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isTeamMemberAuthenticated, requirePermission(PERMISSION_TYPES.DELETE_TASK), async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = req.teamMember;

      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!canAccessDepartment(member, existingTask.departmentId)) {
        return res.status(403).json({ message: "Access denied to this task" });
      }

      await storage.deleteTask(id);

      await storage.createActivityLog(
        member.userId || member.id,
        "deleted_task",
        "task",
        id,
        undefined,
        { title: existingTask.title }
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(400).json({ message: "Failed to delete task" });
    }
  });

  // Task Assignment Routes
  app.post('/api/tasks/:id/assign', isTeamMemberAuthenticated, requirePermission(PERMISSION_TYPES.ASSIGN_TASK), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { teamMemberId } = req.body;
      const member = req.teamMember;

      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!canAccessDepartment(member, task.departmentId)) {
        return res.status(403).json({ message: "Access denied to this task" });
      }

      const assignment = await storage.assignTask(id, teamMemberId, member.id);
      
      await storage.updateTask(id, { assignedToId: teamMemberId });

      await storage.createTaskHistory(task.id, member.id, "assigned", null, { assignedTo: teamMemberId });

      await storage.createActivityLog(
        member.userId || member.id,
        "assigned_task",
        "task",
        task.id,
        undefined,
        { assignedTo: teamMemberId }
      );

      res.json(assignment);
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(400).json({ message: "Failed to assign task" });
    }
  });

  app.get('/api/tasks/:id/history', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = req.teamMember;

      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!canAccessDepartment(member, task.departmentId)) {
        return res.status(403).json({ message: "Access denied to this task" });
      }

      const history = await storage.getTaskHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching task history:", error);
      res.status(500).json({ message: "Failed to fetch task history" });
    }
  });

  // Worklog Routes
  app.post('/api/worklogs', isTeamMemberAuthenticated, requirePermission(PERMISSION_TYPES.SUBMIT_WORKLOG), async (req: any, res) => {
    try {
      const member = req.teamMember;
      const validatedData = insertWorklogSchema.parse({
        ...req.body,
        teamMemberId: member.id,
      });

      const task = await storage.getTask(validatedData.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!canAccessDepartment(member, task.departmentId)) {
        return res.status(403).json({ message: "Access denied to this task" });
      }

      const worklog = await storage.createWorklog(validatedData);

      await storage.createTaskHistory(task.id, member.id, "worklog_added", null, {
        hoursWorked: validatedData.hoursWorked,
        minutesWorked: validatedData.minutesWorked,
      });

      res.json(worklog);
    } catch (error) {
      console.error("Error creating worklog:", error);
      res.status(400).json({ message: "Failed to create worklog" });
    }
  });

  app.get('/api/tasks/:id/worklogs', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = req.teamMember;

      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!canAccessDepartment(member, task.departmentId)) {
        return res.status(403).json({ message: "Access denied to this task" });
      }

      const taskWorklogs = await storage.getWorklogsByTask(id);
      res.json(taskWorklogs);
    } catch (error) {
      console.error("Error fetching worklogs:", error);
      res.status(500).json({ message: "Failed to fetch worklogs" });
    }
  });

  app.get('/api/my-worklogs', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      const myWorklogs = await storage.getWorklogsByTeamMember(member.id);
      res.json(myWorklogs);
    } catch (error) {
      console.error("Error fetching worklogs:", error);
      res.status(500).json({ message: "Failed to fetch worklogs" });
    }
  });

  // Enhanced Team Member Routes with RBAC
  app.post('/api/team-members/create-with-password', 
    isTeamMemberAuthenticated, 
    requireAnyPermission(PERMISSION_TYPES.MANAGE_DEPARTMENT_USERS, PERMISSION_TYPES.MANAGE_GLOBAL_USERS), 
    async (req: any, res) => {
    try {
      const member = req.teamMember;
      const { password, ...memberData } = req.body;

      if (!hasPermission(member, PERMISSION_TYPES.MANAGE_GLOBAL_USERS)) {
        if (memberData.departmentId !== member.departmentId) {
          return res.status(403).json({ message: "Can only create members in your department" });
        }
        if (memberData.roleId) {
          const targetRole = await storage.getRole(memberData.roleId);
          if (targetRole && targetRole.code === ROLE_TYPES.MANAGEMENT) {
            return res.status(403).json({ message: "Cannot create management users" });
          }
        }
      }

      const validatedData = insertTeamMemberSchema.parse(memberData);
      
      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const newMember = await storage.createTeamMember({
        ...validatedData,
        passwordHash,
      } as any);

      await storage.createActivityLog(
        member.userId || member.id,
        "created_team_member",
        "team_member",
        newMember.id,
        undefined,
        { email: newMember.email, role: newMember.role }
      );

      const { passwordHash: _, ...memberWithoutPassword } = newMember;
      res.json(memberWithoutPassword);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(400).json({ message: "Failed to create team member" });
    }
  });

  app.patch('/api/team-members/:id/deactivate', 
    isTeamMemberAuthenticated, 
    requireAnyPermission(PERMISSION_TYPES.MANAGE_DEPARTMENT_USERS, PERMISSION_TYPES.MANAGE_GLOBAL_USERS), 
    async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = req.teamMember;

      const targetMember = await storage.getTeamMember(id);
      if (!targetMember) {
        return res.status(404).json({ message: "Team member not found" });
      }

      if (!hasPermission(member, PERMISSION_TYPES.MANAGE_GLOBAL_USERS)) {
        if (targetMember.departmentId !== member.departmentId) {
          return res.status(403).json({ message: "Can only deactivate members in your department" });
        }
      }

      const updated = await storage.updateTeamMember(id, { status: "inactive" });

      await storage.createActivityLog(
        member.userId || member.id,
        "deactivated_team_member",
        "team_member",
        id,
        undefined,
        { email: targetMember.email }
      );

      res.json(updated);
    } catch (error) {
      console.error("Error deactivating team member:", error);
      res.status(400).json({ message: "Failed to deactivate team member" });
    }
  });

  app.patch('/api/team-members/:id/activate', 
    isTeamMemberAuthenticated, 
    requireAnyPermission(PERMISSION_TYPES.MANAGE_DEPARTMENT_USERS, PERMISSION_TYPES.MANAGE_GLOBAL_USERS), 
    async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = req.teamMember;

      const targetMember = await storage.getTeamMember(id);
      if (!targetMember) {
        return res.status(404).json({ message: "Team member not found" });
      }

      if (!hasPermission(member, PERMISSION_TYPES.MANAGE_GLOBAL_USERS)) {
        if (targetMember.departmentId !== member.departmentId) {
          return res.status(403).json({ message: "Can only activate members in your department" });
        }
      }

      const updated = await storage.updateTeamMember(id, { status: "active" });

      await storage.createActivityLog(
        member.userId || member.id,
        "activated_team_member",
        "team_member",
        id,
        undefined,
        { email: targetMember.email }
      );

      res.json(updated);
    } catch (error) {
      console.error("Error activating team member:", error);
      res.status(400).json({ message: "Failed to activate team member" });
    }
  });

  app.patch('/api/team-members/:id/change-role', 
    isTeamMemberAuthenticated, 
    requirePermission(PERMISSION_TYPES.MANAGE_GLOBAL_USERS), 
    async (req: any, res) => {
    try {
      const { id } = req.params;
      const { roleId } = req.body;
      const member = req.teamMember;

      const targetMember = await storage.getTeamMember(id);
      if (!targetMember) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const newRole = await storage.getRole(roleId);
      if (!newRole) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updated = await storage.updateTeamMember(id, { 
        roleId, 
        role: newRole.code,
      });

      await storage.createActivityLog(
        member.userId || member.id,
        "changed_team_member_role",
        "team_member",
        id,
        undefined,
        { email: targetMember.email, newRole: newRole.code }
      );

      res.json(updated);
    } catch (error) {
      console.error("Error changing team member role:", error);
      res.status(400).json({ message: "Failed to change team member role" });
    }
  });

  app.patch('/api/team-members/:id/change-department', 
    isTeamMemberAuthenticated, 
    requirePermission(PERMISSION_TYPES.MANAGE_GLOBAL_USERS), 
    async (req: any, res) => {
    try {
      const { id } = req.params;
      const { departmentId } = req.body;
      const member = req.teamMember;

      const targetMember = await storage.getTeamMember(id);
      if (!targetMember) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const dept = await storage.getDepartment(departmentId);
      if (!dept) {
        return res.status(400).json({ message: "Invalid department" });
      }

      const updated = await storage.updateTeamMember(id, { departmentId });

      await storage.createActivityLog(
        member.userId || member.id,
        "changed_team_member_department",
        "team_member",
        id,
        undefined,
        { email: targetMember.email, newDepartment: dept.code }
      );

      res.json(updated);
    } catch (error) {
      console.error("Error changing team member department:", error);
      res.status(400).json({ message: "Failed to change team member department" });
    }
  });

  // ==================== STAFF REGISTRATION ROUTES ====================
  
  // Generate a 6-digit OTP
  function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Validate simple CAPTCHA - using a basic challenge/response for dev
  // In production, integrate with hCaptcha or Google reCAPTCHA
  function validateCaptcha(token: string): boolean {
    // Simple validation - token must be present and non-empty
    // In production, verify with actual CAPTCHA service
    if (!token || token.length === 0 || token === 'test-invalid') {
      return false;
    }
    return true;
  }

  // Staff Registration - Creates a pending registration
  app.post('/api/auth/register', async (req: any, res) => {
    try {
      const {
        email, password, firstName, lastName, phone, departmentId,
        addressLine1, addressLine2, city, state, postalCode, country,
        nextOfKin1Name, nextOfKin1Relationship, nextOfKin1Phone, nextOfKin1Email, nextOfKin1Address,
        nextOfKin2Name, nextOfKin2Relationship, nextOfKin2Phone, nextOfKin2Email, nextOfKin2Address,
        captchaToken
      } = req.body;

      // Map country codes to full names
      const countryMap: Record<string, string> = {
        "NG": "Nigeria",
        "US": "United States",
        "UK": "United Kingdom",
        "CA": "Canada",
        "AU": "Australia"
      };

      const countryName = countryMap[country] || country || 'Nigeria';

      // Validate CAPTCHA
      if (!validateCaptcha(captchaToken)) {
        return res.status(400).json({ message: "CAPTCHA verification failed. Please try again." });
      }

      // Check if email already exists in team members
      const existingMember = await storage.getTeamMemberByEmail(email);
      if (existingMember) {
        return res.status(400).json({ message: "An account with this email already exists." });
      }

      // Check if email already exists in pending registrations
      const existingPending = await storage.getPendingRegistrationByEmail(email);
      if (existingPending) {
        if (existingPending.status === 'pending') {
          return res.status(400).json({ message: "A registration with this email is already pending approval." });
        } else if (existingPending.status === 'rejected') {
          // Delete the old rejected registration and allow a new one
          await storage.deletePendingRegistration(existingPending.id);
        }
      }

      // Validate department exists
      const dept = await storage.getDepartment(departmentId);
      if (!dept) {
        return res.status(400).json({ message: "Invalid department selected." });
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create pending registration
      const registration = await storage.createPendingRegistration({
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        departmentId,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country: countryName,
        nextOfKin1Name,
        nextOfKin1Relationship,
        nextOfKin1Phone,
        nextOfKin1Email: nextOfKin1Email || null,
        nextOfKin1Address: nextOfKin1Address || null,
        nextOfKin2Name,
        nextOfKin2Relationship,
        nextOfKin2Phone,
        nextOfKin2Email: nextOfKin2Email || null,
        nextOfKin2Address: nextOfKin2Address || null,
      });

      // Generate OTP for approval (valid for 24 hours)
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createApprovalOtp(registration.id, otpCode, expiresAt);

      // Create admin notification
      await storage.createAdminNotification(
        'registration_pending',
        'New Staff Registration',
        `${firstName} ${lastName} (${email}) has submitted a registration request for ${dept.name} department. OTP: ${otpCode}`,
        3, // Management level
        'pending_registration',
        registration.id,
        { otpCode, departmentName: dept.name, applicantName: `${firstName} ${lastName}` }
      );

      res.status(201).json({
        message: "Registration submitted successfully! Your application is pending approval by management.",
        registrationId: registration.id,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to submit registration. Please try again." });
    }
  });

  // Get departments for registration (public endpoint)
  app.get('/api/public/departments', async (req: any, res) => {
    try {
      const departments = await storage.getAllDepartments();
      // Return only active departments with minimal info
      const publicDepts = departments
        .filter(d => d.status === 'active')
        .map(d => ({ id: d.id, name: d.name, code: d.code }));
      res.json(publicDepts);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Get all pending registrations (Management only)
  app.get('/api/registrations', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { status } = req.query;
      const registrations = await storage.getAllPendingRegistrations(status as string);
      
      // Enrich with department info
      const enrichedRegistrations = await Promise.all(registrations.map(async (reg) => {
        const dept = await storage.getDepartment(reg.departmentId);
        const otp = await storage.getLatestOtpForRegistration(reg.id);
        return {
          ...reg,
          passwordHash: undefined, // Don't expose password hash
          department: dept ? { id: dept.id, name: dept.name, code: dept.code } : null,
          latestOtp: otp && !otp.isUsed && otp.expiresAt > new Date() ? {
            code: otp.otpCode,
            expiresAt: otp.expiresAt,
          } : null,
        };
      }));

      res.json(enrichedRegistrations);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Get single pending registration
  app.get('/api/registrations/:id', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { id } = req.params;
      const registration = await storage.getPendingRegistration(id);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      const dept = await storage.getDepartment(registration.departmentId);
      const otp = await storage.getLatestOtpForRegistration(registration.id);

      res.json({
        ...registration,
        passwordHash: undefined,
        department: dept ? { id: dept.id, name: dept.name, code: dept.code } : null,
        latestOtp: otp && !otp.isUsed && otp.expiresAt > new Date() ? {
          code: otp.otpCode,
          expiresAt: otp.expiresAt,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching registration:", error);
      res.status(500).json({ message: "Failed to fetch registration" });
    }
  });

  // Generate new OTP for a registration
  app.post('/api/registrations/:id/generate-otp', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = req.teamMember;

      const registration = await storage.getPendingRegistration(id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      if (registration.status !== 'pending') {
        return res.status(400).json({ message: "Registration is no longer pending" });
      }

      // Generate new OTP (valid for 24 hours)
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createApprovalOtp(registration.id, otpCode, expiresAt);

      await storage.createActivityLog(
        member.userId || member.id,
        "generated_registration_otp",
        "pending_registration",
        id,
        undefined,
        { applicantEmail: registration.email }
      );

      res.json({ 
        message: "New OTP generated successfully",
        otp: { code: otpCode, expiresAt }
      });
    } catch (error) {
      console.error("Error generating OTP:", error);
      res.status(500).json({ message: "Failed to generate OTP" });
    }
  });

  // Approve registration with OTP
  app.post('/api/registrations/:id/approve', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { otpCode, roleId, employeeId } = req.body;
      const member = req.teamMember;

      if (!otpCode) {
        return res.status(400).json({ message: "OTP is required for approval" });
      }

      const registration = await storage.getPendingRegistration(id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      if (registration.status !== 'pending') {
        return res.status(400).json({ message: "Registration is no longer pending" });
      }

      // Validate OTP
      const validOtp = await storage.getValidApprovalOtp(id, otpCode);
      if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Validate role if provided
      let selectedRole = null;
      if (roleId) {
        selectedRole = await storage.getRole(roleId);
        if (!selectedRole) {
          return res.status(400).json({ message: "Invalid role selected" });
        }
      } else {
        // Default to technician role
        selectedRole = await storage.getRoleByCode(ROLE_TYPES.TECHNICIAN);
      }

      // Create the team member from the registration
      const newMember = await storage.createTeamMember({
        email: registration.email,
        passwordHash: registration.passwordHash,
        firstName: registration.firstName,
        lastName: registration.lastName,
        phone: registration.phone,
        departmentId: registration.departmentId,
        roleId: selectedRole?.id,
        role: selectedRole?.code || ROLE_TYPES.TECHNICIAN,
        employeeId: employeeId || null,
        status: 'active',
        // Extended fields
        addressLine1: registration.addressLine1,
        addressLine2: registration.addressLine2,
        city: registration.city,
        state: registration.state,
        postalCode: registration.postalCode,
        country: registration.country,
        nextOfKin1Name: registration.nextOfKin1Name,
        nextOfKin1Relationship: registration.nextOfKin1Relationship,
        nextOfKin1Phone: registration.nextOfKin1Phone,
        nextOfKin1Email: registration.nextOfKin1Email,
        nextOfKin1Address: registration.nextOfKin1Address,
        nextOfKin2Name: registration.nextOfKin2Name,
        nextOfKin2Relationship: registration.nextOfKin2Relationship,
        nextOfKin2Phone: registration.nextOfKin2Phone,
        nextOfKin2Email: registration.nextOfKin2Email,
        nextOfKin2Address: registration.nextOfKin2Address,
      });

      // Mark OTP as used
      await storage.markOtpAsUsed(validOtp.id, member.id);

      // Update registration status
      await storage.updatePendingRegistration(id, {
        status: 'approved',
        reviewedById: member.id,
        reviewedAt: new Date(),
      });

      // Create activity log
      await storage.createActivityLog(
        member.userId || member.id,
        "approved_registration",
        "team_member",
        newMember.id,
        undefined,
        { applicantEmail: registration.email, role: selectedRole?.code }
      );

      // Create notification about approval
      await storage.createAdminNotification(
        'registration_approved',
        'Registration Approved',
        `${registration.firstName} ${registration.lastName} (${registration.email}) has been approved and added as a ${selectedRole?.name || 'Technician'}.`,
        2, // Department Admin and above
        'team_member',
        newMember.id,
        { approvedBy: `${member.firstName} ${member.lastName}` }
      );

      res.json({
        message: "Registration approved successfully",
        teamMember: {
          id: newMember.id,
          email: newMember.email,
          firstName: newMember.firstName,
          lastName: newMember.lastName,
          role: newMember.role,
        }
      });
    } catch (error: any) {
      console.error("Error approving registration:", error);
      if (error.message?.includes('duplicate')) {
        return res.status(400).json({ message: "A team member with this email already exists" });
      }
      res.status(500).json({ message: "Failed to approve registration" });
    }
  });

  // Reject registration
  app.post('/api/registrations/:id/reject', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const member = req.teamMember;

      const registration = await storage.getPendingRegistration(id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      if (registration.status !== 'pending') {
        return res.status(400).json({ message: "Registration is no longer pending" });
      }

      // Update registration status
      await storage.updatePendingRegistration(id, {
        status: 'rejected',
        rejectionReason: reason || 'Application rejected by management',
        reviewedById: member.id,
        reviewedAt: new Date(),
      });

      // Create activity log
      await storage.createActivityLog(
        member.userId || member.id,
        "rejected_registration",
        "pending_registration",
        id,
        undefined,
        { applicantEmail: registration.email, reason }
      );

      res.json({ message: "Registration rejected successfully" });
    } catch (error) {
      console.error("Error rejecting registration:", error);
      res.status(500).json({ message: "Failed to reject registration" });
    }
  });

  // Get pending registration count
  app.get('/api/registrations/count/pending', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const count = await storage.getPendingRegistrationCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching pending count:", error);
      res.status(500).json({ message: "Failed to fetch pending count" });
    }
  });

  // ==================== NOTIFICATION ROUTES ====================

  // Get notifications for current user
  app.get('/api/notifications', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      const { unreadOnly, limit } = req.query;

      // Get role level from member's role
      const role = await storage.getRole(member.roleId);
      const roleLevel = role?.level || 1;

      let notifications;
      if (unreadOnly === 'true') {
        notifications = await storage.getUnreadNotifications(roleLevel);
      } else {
        notifications = await storage.getAllNotifications(roleLevel, parseInt(limit as string) || 50);
      }

      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/count', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      const role = await storage.getRole(member.roleId);
      const roleLevel = role?.level || 1;

      const notifications = await storage.getUnreadNotifications(roleLevel);
      res.json({ count: notifications.length });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  // Mark notification as read
  app.post('/api/notifications/:id/read', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = req.teamMember;

      await storage.markNotificationAsRead(id, member.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/read-all', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      const role = await storage.getRole(member.roleId);
      const roleLevel = role?.level || 1;

      await storage.markAllNotificationsAsRead(member.id, roleLevel);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
