import { db } from "./db";
import { 
  roles, 
  permissions, 
  rolePermissions, 
  departments, 
  teamMembers,
  ROLE_TYPES,
  PERMISSION_TYPES 
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting database seed...");

  try {
    // Check if already seeded
    const existingRoles = await db.select().from(roles);
    if (existingRoles.length > 0) {
      console.log("Database already seeded. Skipping...");
      return;
    }

    // 1. Create Roles
    console.log("Creating roles...");
    const rolesData = [
      { 
        name: "Technician", 
        code: ROLE_TYPES.TECHNICIAN, 
        description: "Field technician with basic task access", 
        level: 1 
      },
      { 
        name: "Department Admin", 
        code: ROLE_TYPES.DEPARTMENT_ADMIN, 
        description: "Department administrator with user management within their department", 
        level: 2 
      },
      { 
        name: "Management", 
        code: ROLE_TYPES.MANAGEMENT, 
        description: "Full access to all departments and global user management", 
        level: 3 
      },
    ];

    const insertedRoles = await db.insert(roles).values(rolesData).returning();
    console.log(`Created ${insertedRoles.length} roles`);

    const roleMap = {
      [ROLE_TYPES.TECHNICIAN]: insertedRoles.find(r => r.code === ROLE_TYPES.TECHNICIAN)!,
      [ROLE_TYPES.DEPARTMENT_ADMIN]: insertedRoles.find(r => r.code === ROLE_TYPES.DEPARTMENT_ADMIN)!,
      [ROLE_TYPES.MANAGEMENT]: insertedRoles.find(r => r.code === ROLE_TYPES.MANAGEMENT)!,
    };

    // 2. Create Permissions
    console.log("Creating permissions...");
    const permissionsData = [
      { name: "View Tasks", code: PERMISSION_TYPES.VIEW_TASKS, description: "View assigned tasks", category: "tasks" },
      { name: "Create Task", code: PERMISSION_TYPES.CREATE_TASK, description: "Create new tasks", category: "tasks" },
      { name: "Update Task", code: PERMISSION_TYPES.UPDATE_TASK, description: "Update task details and status", category: "tasks" },
      { name: "Delete Task", code: PERMISSION_TYPES.DELETE_TASK, description: "Delete tasks", category: "tasks" },
      { name: "Assign Task", code: PERMISSION_TYPES.ASSIGN_TASK, description: "Assign tasks to technicians", category: "tasks" },
      { name: "View Own Department", code: PERMISSION_TYPES.VIEW_OWN_DEPARTMENT, description: "View own department data", category: "dashboard" },
      { name: "View All Departments", code: PERMISSION_TYPES.VIEW_ALL_DEPARTMENTS, description: "View all departments data", category: "dashboard" },
      { name: "View Department Dashboard", code: PERMISSION_TYPES.VIEW_DEPARTMENT_DASHBOARD, description: "View department dashboard", category: "dashboard" },
      { name: "View Global Dashboard", code: PERMISSION_TYPES.VIEW_GLOBAL_DASHBOARD, description: "View global dashboard with all stats", category: "dashboard" },
      { name: "Manage Department Users", code: PERMISSION_TYPES.MANAGE_DEPARTMENT_USERS, description: "Add/edit/deactivate users in own department", category: "users" },
      { name: "Manage Global Users", code: PERMISSION_TYPES.MANAGE_GLOBAL_USERS, description: "Full user management across all departments", category: "users" },
      { name: "View Department Logs", code: PERMISSION_TYPES.VIEW_DEPARTMENT_LOGS, description: "View activity logs for own department", category: "logs" },
      { name: "View All Logs", code: PERMISSION_TYPES.VIEW_ALL_LOGS, description: "View all activity logs", category: "logs" },
      { name: "Manage Service Config", code: PERMISSION_TYPES.MANAGE_SERVICE_CONFIG, description: "Configure external service integrations", category: "settings" },
      { name: "View Analytics", code: PERMISSION_TYPES.VIEW_ANALYTICS, description: "View analytics and metrics", category: "analytics" },
      { name: "Submit Worklog", code: PERMISSION_TYPES.SUBMIT_WORKLOG, description: "Submit work time and notes", category: "tasks" },
    ];

    const insertedPermissions = await db.insert(permissions).values(permissionsData).returning();
    console.log(`Created ${insertedPermissions.length} permissions`);

    const permMap: Record<string, typeof insertedPermissions[0]> = {};
    insertedPermissions.forEach(p => {
      permMap[p.code] = p;
    });

    // 3. Create Role-Permission mappings
    console.log("Mapping permissions to roles...");
    
    // Technician permissions
    const technicianPerms = [
      PERMISSION_TYPES.VIEW_TASKS,
      PERMISSION_TYPES.UPDATE_TASK,
      PERMISSION_TYPES.VIEW_OWN_DEPARTMENT,
      PERMISSION_TYPES.SUBMIT_WORKLOG,
    ];

    // Department Admin permissions (includes technician perms)
    const deptAdminPerms = [
      ...technicianPerms,
      PERMISSION_TYPES.CREATE_TASK,
      PERMISSION_TYPES.DELETE_TASK,
      PERMISSION_TYPES.ASSIGN_TASK,
      PERMISSION_TYPES.VIEW_DEPARTMENT_DASHBOARD,
      PERMISSION_TYPES.MANAGE_DEPARTMENT_USERS,
      PERMISSION_TYPES.VIEW_DEPARTMENT_LOGS,
      PERMISSION_TYPES.VIEW_ANALYTICS,
    ];

    // Management permissions (all permissions)
    const managementPerms = Object.values(PERMISSION_TYPES);

    const rolePermissionsData = [
      ...technicianPerms.map(perm => ({
        roleId: roleMap[ROLE_TYPES.TECHNICIAN].id,
        permissionId: permMap[perm].id,
      })),
      ...deptAdminPerms.map(perm => ({
        roleId: roleMap[ROLE_TYPES.DEPARTMENT_ADMIN].id,
        permissionId: permMap[perm].id,
      })),
      ...managementPerms.map(perm => ({
        roleId: roleMap[ROLE_TYPES.MANAGEMENT].id,
        permissionId: permMap[perm].id,
      })),
    ];

    await db.insert(rolePermissions).values(rolePermissionsData);
    console.log(`Created ${rolePermissionsData.length} role-permission mappings`);

    // 4. Create Departments
    console.log("Creating departments...");
    const departmentsData = [
      { name: "Home Appliances", code: "HA", description: "Home Appliances Division - Repairs and maintenance", status: "active" as const },
      { name: "Home Entertainment Products", code: "HHP", description: "Home Entertainment Products - TVs, audio systems", status: "active" as const },
      { name: "Digital Television", code: "DTV", description: "Digital Television Services - Installation and support", status: "active" as const },
    ];

    const insertedDepts = await db.insert(departments).values(departmentsData).returning();
    console.log(`Created ${insertedDepts.length} departments`);

    const deptMap: Record<string, typeof insertedDepts[0]> = {};
    insertedDepts.forEach(d => {
      deptMap[d.code] = d;
    });

    // 5. Create Default Admin User (Management)
    console.log("Creating default admin user...");
    const passwordHash = await bcrypt.hash("admin123", 10);
    
    const adminUser = await db.insert(teamMembers).values({
      departmentId: deptMap["HA"].id,
      roleId: roleMap[ROLE_TYPES.MANAGEMENT].id,
      employeeId: "ADMIN001",
      email: "admin@company.com",
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      passwordHash: passwordHash,
      phone: "",
      status: "active",
    }).returning();

    console.log("Created admin user: admin@company.com / admin123");

    // 6. Create sample users for each role/department
    console.log("Creating sample users...");
    
    const sampleUsers = [
      // Department Admins for each department
      {
        departmentId: deptMap["HA"].id,
        roleId: roleMap[ROLE_TYPES.DEPARTMENT_ADMIN].id,
        employeeId: "HA-ADMIN",
        email: "ha.admin@company.com",
        firstName: "HA",
        lastName: "Admin",
        role: "admin",
        passwordHash: passwordHash,
        status: "active" as const,
      },
      {
        departmentId: deptMap["HHP"].id,
        roleId: roleMap[ROLE_TYPES.DEPARTMENT_ADMIN].id,
        employeeId: "HHP-ADMIN",
        email: "hhp.admin@company.com",
        firstName: "HHP",
        lastName: "Admin",
        role: "admin",
        passwordHash: passwordHash,
        status: "active" as const,
      },
      {
        departmentId: deptMap["DTV"].id,
        roleId: roleMap[ROLE_TYPES.DEPARTMENT_ADMIN].id,
        employeeId: "DTV-ADMIN",
        email: "dtv.admin@company.com",
        firstName: "DTV",
        lastName: "Admin",
        role: "admin",
        passwordHash: passwordHash,
        status: "active" as const,
      },
      // Technicians for each department
      {
        departmentId: deptMap["HA"].id,
        roleId: roleMap[ROLE_TYPES.TECHNICIAN].id,
        employeeId: "HA-TECH1",
        email: "ha.tech1@company.com",
        firstName: "John",
        lastName: "Smith",
        role: "technician",
        passwordHash: passwordHash,
        status: "active" as const,
      },
      {
        departmentId: deptMap["HHP"].id,
        roleId: roleMap[ROLE_TYPES.TECHNICIAN].id,
        employeeId: "HHP-TECH1",
        email: "hhp.tech1@company.com",
        firstName: "Jane",
        lastName: "Doe",
        role: "technician",
        passwordHash: passwordHash,
        status: "active" as const,
      },
      {
        departmentId: deptMap["DTV"].id,
        roleId: roleMap[ROLE_TYPES.TECHNICIAN].id,
        employeeId: "DTV-TECH1",
        email: "dtv.tech1@company.com",
        firstName: "Mike",
        lastName: "Johnson",
        role: "technician",
        passwordHash: passwordHash,
        status: "active" as const,
      },
    ];

    await db.insert(teamMembers).values(sampleUsers);
    console.log(`Created ${sampleUsers.length} sample users`);

    console.log("\n=== Seed Complete ===");
    console.log("\nTest Accounts (password: admin123):");
    console.log("Management: admin@company.com");
    console.log("HA Dept Admin: ha.admin@company.com");
    console.log("HHP Dept Admin: hhp.admin@company.com");
    console.log("DTV Dept Admin: dtv.admin@company.com");
    console.log("HA Technician: ha.tech1@company.com");
    console.log("HHP Technician: hhp.tech1@company.com");
    console.log("DTV Technician: dtv.tech1@company.com");

  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
