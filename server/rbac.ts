import { RequestHandler, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { 
  roles, 
  permissions, 
  rolePermissions, 
  teamMembers,
  departments,
  ROLE_TYPES,
  PERMISSION_TYPES,
  type Role,
  type Permission,
  type TeamMember,
  type PermissionType,
  type RoleType,
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface AuthenticatedTeamMember extends TeamMember {
  roleName?: string;
  roleCode?: RoleType;
  roleLevel?: number;
  departmentCode?: string;
  departmentName?: string;
  permissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      teamMember?: AuthenticatedTeamMember;
    }
  }
}

export async function getTeamMemberWithPermissions(teamMemberId: string): Promise<AuthenticatedTeamMember | null> {
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, teamMemberId));
  
  if (!member) return null;

  let roleData: Role | undefined;
  let departmentData: { code: string; name: string } | undefined;
  let memberPermissions: string[] = [];

  if (member.roleId) {
    const [role] = await db.select().from(roles).where(eq(roles.id, member.roleId));
    roleData = role;

    if (role) {
      const rolePerms = await db
        .select({ code: permissions.code })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, role.id));
      
      memberPermissions = rolePerms.map(p => p.code);
    }
  }

  const [dept] = await db
    .select({ code: departments.code, name: departments.name })
    .from(departments)
    .where(eq(departments.id, member.departmentId));
  departmentData = dept;

  return {
    ...member,
    roleName: roleData?.name,
    roleCode: roleData?.code as RoleType,
    roleLevel: roleData?.level,
    departmentCode: departmentData?.code,
    departmentName: departmentData?.name,
    permissions: memberPermissions,
  };
}

export function hasPermission(member: AuthenticatedTeamMember, permission: PermissionType): boolean {
  if (!member.permissions) return false;
  return member.permissions.includes(permission);
}

export function hasAnyPermission(member: AuthenticatedTeamMember, permissions: PermissionType[]): boolean {
  if (!member.permissions) return false;
  return permissions.some(p => member.permissions?.includes(p));
}

export function hasAllPermissions(member: AuthenticatedTeamMember, permissions: PermissionType[]): boolean {
  if (!member.permissions) return false;
  return permissions.every(p => member.permissions?.includes(p));
}

export function isRole(member: AuthenticatedTeamMember, roleCode: RoleType): boolean {
  return member.roleCode === roleCode;
}

export function isRoleOrHigher(member: AuthenticatedTeamMember, roleCode: RoleType): boolean {
  const roleLevels: Record<RoleType, number> = {
    [ROLE_TYPES.TECHNICIAN]: 1,
    [ROLE_TYPES.DEPARTMENT_ADMIN]: 2,
    [ROLE_TYPES.MANAGEMENT]: 3,
  };
  
  const requiredLevel = roleLevels[roleCode];
  return (member.roleLevel ?? 0) >= requiredLevel;
}

export function canAccessDepartment(member: AuthenticatedTeamMember, departmentId: string): boolean {
  if (isRole(member, ROLE_TYPES.MANAGEMENT)) return true;
  return member.departmentId === departmentId;
}

export const requirePermission = (permission: PermissionType): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const member = req.teamMember;
    
    if (!member) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasPermission(member, permission)) {
      return res.status(403).json({ 
        message: "Access denied",
        required: permission,
      });
    }

    next();
  };
};

export const requireAnyPermission = (...permissions: PermissionType[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const member = req.teamMember;
    
    if (!member) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasAnyPermission(member, permissions)) {
      return res.status(403).json({ 
        message: "Access denied",
        required: permissions,
      });
    }

    next();
  };
};

export const requireRole = (roleCode: RoleType): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const member = req.teamMember;
    
    if (!member) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!isRole(member, roleCode)) {
      return res.status(403).json({ 
        message: "Access denied",
        requiredRole: roleCode,
      });
    }

    next();
  };
};

export const requireRoleOrHigher = (roleCode: RoleType): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const member = req.teamMember;
    
    if (!member) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!isRoleOrHigher(member, roleCode)) {
      return res.status(403).json({ 
        message: "Access denied",
        minimumRole: roleCode,
      });
    }

    next();
  };
};

export const requireDepartmentAccess = (getDepartmentId: (req: Request) => string | undefined): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const member = req.teamMember;
    
    if (!member) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const departmentId = getDepartmentId(req);
    if (!departmentId) {
      return res.status(400).json({ message: "Department ID required" });
    }

    if (!canAccessDepartment(member, departmentId)) {
      return res.status(403).json({ 
        message: "Access denied to this department",
      });
    }

    next();
  };
};

export async function seedRolesAndPermissions(): Promise<void> {
  const existingRoles = await db.select().from(roles);
  if (existingRoles.length > 0) {
    console.log("Roles already seeded, skipping...");
    return;
  }

  console.log("Seeding roles and permissions...");

  const roleData = [
    { name: "Technician", code: ROLE_TYPES.TECHNICIAN, description: "Field technician with task execution access", level: 1 },
    { name: "Department Admin", code: ROLE_TYPES.DEPARTMENT_ADMIN, description: "Department administrator with department-level management", level: 2 },
    { name: "Management", code: ROLE_TYPES.MANAGEMENT, description: "Global management with full system access", level: 3 },
  ];

  const insertedRoles = await db.insert(roles).values(roleData).returning();
  console.log(`Inserted ${insertedRoles.length} roles`);

  const permissionData = [
    { name: "View Tasks", code: PERMISSION_TYPES.VIEW_TASKS, category: "tasks" },
    { name: "Create Task", code: PERMISSION_TYPES.CREATE_TASK, category: "tasks" },
    { name: "Update Task", code: PERMISSION_TYPES.UPDATE_TASK, category: "tasks" },
    { name: "Delete Task", code: PERMISSION_TYPES.DELETE_TASK, category: "tasks" },
    { name: "Assign Task", code: PERMISSION_TYPES.ASSIGN_TASK, category: "tasks" },
    { name: "View Own Department", code: PERMISSION_TYPES.VIEW_OWN_DEPARTMENT, category: "departments" },
    { name: "View All Departments", code: PERMISSION_TYPES.VIEW_ALL_DEPARTMENTS, category: "departments" },
    { name: "View Department Dashboard", code: PERMISSION_TYPES.VIEW_DEPARTMENT_DASHBOARD, category: "dashboard" },
    { name: "View Global Dashboard", code: PERMISSION_TYPES.VIEW_GLOBAL_DASHBOARD, category: "dashboard" },
    { name: "Manage Department Users", code: PERMISSION_TYPES.MANAGE_DEPARTMENT_USERS, category: "users" },
    { name: "Manage Global Users", code: PERMISSION_TYPES.MANAGE_GLOBAL_USERS, category: "users" },
    { name: "View Department Logs", code: PERMISSION_TYPES.VIEW_DEPARTMENT_LOGS, category: "logs" },
    { name: "View All Logs", code: PERMISSION_TYPES.VIEW_ALL_LOGS, category: "logs" },
    { name: "Manage Service Config", code: PERMISSION_TYPES.MANAGE_SERVICE_CONFIG, category: "settings" },
    { name: "View Analytics", code: PERMISSION_TYPES.VIEW_ANALYTICS, category: "analytics" },
    { name: "Submit Worklog", code: PERMISSION_TYPES.SUBMIT_WORKLOG, category: "tasks" },
  ];

  const insertedPermissions = await db.insert(permissions).values(permissionData).returning();
  console.log(`Inserted ${insertedPermissions.length} permissions`);

  const permissionMap = new Map(insertedPermissions.map(p => [p.code, p.id]));
  const roleMap = new Map(insertedRoles.map(r => [r.code, r.id]));

  const technicianPerms = [
    PERMISSION_TYPES.VIEW_TASKS,
    PERMISSION_TYPES.UPDATE_TASK,
    PERMISSION_TYPES.VIEW_OWN_DEPARTMENT,
    PERMISSION_TYPES.SUBMIT_WORKLOG,
  ];

  const deptAdminPerms = [
    ...technicianPerms,
    PERMISSION_TYPES.CREATE_TASK,
    PERMISSION_TYPES.ASSIGN_TASK,
    PERMISSION_TYPES.VIEW_DEPARTMENT_DASHBOARD,
    PERMISSION_TYPES.MANAGE_DEPARTMENT_USERS,
    PERMISSION_TYPES.VIEW_DEPARTMENT_LOGS,
    PERMISSION_TYPES.VIEW_ANALYTICS,
  ];

  const managementPerms = [
    ...Object.values(PERMISSION_TYPES),
  ];

  const rolePermissionData: { roleId: string; permissionId: string }[] = [];

  const techRoleId = roleMap.get(ROLE_TYPES.TECHNICIAN);
  const deptAdminRoleId = roleMap.get(ROLE_TYPES.DEPARTMENT_ADMIN);
  const mgmtRoleId = roleMap.get(ROLE_TYPES.MANAGEMENT);

  if (techRoleId) {
    technicianPerms.forEach(perm => {
      const permId = permissionMap.get(perm);
      if (permId) rolePermissionData.push({ roleId: techRoleId, permissionId: permId });
    });
  }

  if (deptAdminRoleId) {
    deptAdminPerms.forEach(perm => {
      const permId = permissionMap.get(perm);
      if (permId) rolePermissionData.push({ roleId: deptAdminRoleId, permissionId: permId });
    });
  }

  if (mgmtRoleId) {
    managementPerms.forEach(perm => {
      const permId = permissionMap.get(perm);
      if (permId) rolePermissionData.push({ roleId: mgmtRoleId, permissionId: permId });
    });
  }

  await db.insert(rolePermissions).values(rolePermissionData);
  console.log(`Inserted ${rolePermissionData.length} role-permission mappings`);

  console.log("Roles and permissions seeded successfully!");
}

export async function seedDefaultDepartments(): Promise<void> {
  const existingDepts = await db.select().from(departments);
  if (existingDepts.length > 0) {
    console.log("Departments already seeded, skipping...");
    return;
  }

  console.log("Seeding default departments...");

  const deptData = [
    { name: "Home Appliances", code: "HA", description: "Home Appliances Department" },
    { name: "Home Healthcare Products", code: "HHP", description: "Home Healthcare Products Department" },
    { name: "Digital TV", code: "DTV", description: "Digital TV Department" },
  ];

  const insertedDepts = await db.insert(departments).values(deptData).returning();
  console.log(`Inserted ${insertedDepts.length} departments`);
}
