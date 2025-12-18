import { db } from "./db";
import { 
  roles, 
  permissions, 
  rolePermissions, 
  departments, 
  teamMembers,
  teams,
  teamMemberTeams,
  ROLE_TYPES,
  PERMISSION_TYPES,
  TEAM_TYPES
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting database seed...");

  try {
    // Get admin password from env or use default (WARNING: change in production!)
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV === "production") {
      console.warn("⚠️  SECURITY WARNING: Using default admin password 'admin123' in production!");
      console.warn("⚠️  Set ADMIN_PASSWORD environment variable to change it.");
    }

    // Check if already seeded
    const existingRoles = await db.select().from(roles);
    if (existingRoles.length > 0) {
      console.log("Database already seeded. Skipping...");
      console.log("To force re-seed (including reset admin password), set SEED_FORCE=true");
      return;
    }

    // Wrap entire seed in transaction for atomicity (all-or-nothing)
    await db.transaction(async (tx) => {
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

      const insertedRoles = await tx.insert(roles).values(rolesData).returning();
      console.log(`Created ${insertedRoles.length} roles`);

      // Validate all required roles were created
      const roleMap = {
        [ROLE_TYPES.TECHNICIAN]: insertedRoles.find(r => r.code === ROLE_TYPES.TECHNICIAN),
        [ROLE_TYPES.DEPARTMENT_ADMIN]: insertedRoles.find(r => r.code === ROLE_TYPES.DEPARTMENT_ADMIN),
        [ROLE_TYPES.MANAGEMENT]: insertedRoles.find(r => r.code === ROLE_TYPES.MANAGEMENT),
      };

      // Validate role lookups
      if (!roleMap[ROLE_TYPES.TECHNICIAN]) throw new Error("Failed to create Technician role");
      if (!roleMap[ROLE_TYPES.DEPARTMENT_ADMIN]) throw new Error("Failed to create Department Admin role");
      if (!roleMap[ROLE_TYPES.MANAGEMENT]) throw new Error("Failed to create Management role");

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

      const insertedPermissions = await tx.insert(permissions).values(permissionsData).returning();
      console.log(`Created ${insertedPermissions.length} permissions`);

      const permMap: Record<string, typeof insertedPermissions[0]> = {};
      insertedPermissions.forEach(p => {
        permMap[p.code] = p;
      });

      // Validate all permissions exist
      const missingPerms = Object.values(PERMISSION_TYPES).filter(perm => !permMap[perm]);
      if (missingPerms.length > 0) {
        throw new Error(`Failed to create permissions: ${missingPerms.join(", ")}`);
      }

      // 3. Create Role-Permission mappings
      console.log("Mapping permissions to roles...");
      
      const technicianPerms = [
        PERMISSION_TYPES.VIEW_TASKS,
        PERMISSION_TYPES.UPDATE_TASK,
        PERMISSION_TYPES.VIEW_OWN_DEPARTMENT,
        PERMISSION_TYPES.SUBMIT_WORKLOG,
      ];

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

      const managementPerms = Object.values(PERMISSION_TYPES);

      const rolePermissionsData = [
        ...technicianPerms.map(perm => ({
          roleId: roleMap[ROLE_TYPES.TECHNICIAN]!.id,
          permissionId: permMap[perm].id,
        })),
        ...deptAdminPerms.map(perm => ({
          roleId: roleMap[ROLE_TYPES.DEPARTMENT_ADMIN]!.id,
          permissionId: permMap[perm].id,
        })),
        ...managementPerms.map(perm => ({
          roleId: roleMap[ROLE_TYPES.MANAGEMENT]!.id,
          permissionId: permMap[perm].id,
        })),
      ];

      await tx.insert(rolePermissions).values(rolePermissionsData);
      console.log(`Created ${rolePermissionsData.length} role-permission mappings`);

      // 4. Create Departments
      console.log("Creating departments...");
      const departmentsData = [
        { name: "Home Appliances", code: "HA", description: "Home Appliances Division - Repairs and maintenance", status: "active" as const },
        { name: "Home Entertainment Products", code: "HHP", description: "Home Entertainment Products - TVs, audio systems", status: "active" as const },
        { name: "Digital Television", code: "DTV", description: "Digital Television Services - Installation and support", status: "active" as const },
      ];

      const insertedDepts = await tx.insert(departments).values(departmentsData).returning();
      console.log(`Created ${insertedDepts.length} departments`);

      const deptMap: Record<string, typeof insertedDepts[0]> = {};
      insertedDepts.forEach(d => {
        deptMap[d.code] = d;
      });

      // Validate all departments created
      if (!deptMap["HA"] || !deptMap["HHP"] || !deptMap["DTV"]) {
        throw new Error("Failed to create all required departments");
      }

      // 5. Create Super Admin User (Management Role)
      console.log("Creating super admin user...");
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      const adminUser = await tx.insert(teamMembers).values({
        departmentId: deptMap["HA"].id,
        roleId: roleMap[ROLE_TYPES.MANAGEMENT]!.id,
        employeeId: "ADMIN001",
        email: "admin@company.com",
        firstName: "System",
        lastName: "Administrator",
        role: "admin",
        passwordHash: passwordHash,
        phone: "",
        status: "active",
        isVerified: true,
      }).returning();

      if (!adminUser[0]) {
        throw new Error("Failed to create admin user");
      }

      console.log(`Created super admin user: admin@company.com / ${adminPassword}`);

      // 6. Create Teams for Tiered Support Architecture
      console.log("Creating teams for tiered support...");
      
      const allStaffTeam = await tx.insert(teams).values({
        name: "All Staff",
        code: "all_staff",
        description: "Parent team - All staff members receive messages sent to main support email",
        teamType: TEAM_TYPES.ALL_STAFF,
        emailAddress: "support@allelectronics.co.za",
        isDefault: true,
        status: "active",
      }).returning();
      console.log("Created 'All Staff' team");

      const departmentTeams = [];
      for (const dept of insertedDepts) {
        const teamCode = dept.code.toLowerCase() + "_team";
        const deptTeam = await tx.insert(teams).values({
          name: `${dept.name} Team`,
          code: teamCode,
          description: `Team for ${dept.name} department - Only ${dept.name} staff see these messages`,
          teamType: TEAM_TYPES.DEPARTMENT,
          departmentId: dept.id,
          emailAddress: `${dept.code.toLowerCase()}@allelectronics.co.za`,
          isDefault: false,
          status: "active",
        }).returning();
        departmentTeams.push(deptTeam[0]);
        console.log(`Created '${dept.name} Team'`);
      }

      // 7. Add admin to all teams
      console.log("Adding admin to all teams...");
      
      await tx.insert(teamMemberTeams).values({
        teamMemberId: adminUser[0].id,
        teamId: allStaffTeam[0].id,
        isActive: true,
      });

      for (const deptTeam of departmentTeams) {
        await tx.insert(teamMemberTeams).values({
          teamMemberId: adminUser[0].id,
          teamId: deptTeam.id,
          isActive: true,
        });
      }
      console.log("Admin added to all teams");

      console.log("\n=== Seed Complete ===");
      console.log(`\nSuper Admin Account (password: ${adminPassword}):`);
      console.log("Email: admin@company.com");
      console.log("\nTeams Created:");
      console.log("- All Staff (everyone auto-joins - for support@ emails)");
      console.log("- Home Appliances Team (HA department)");
      console.log("- Home Entertainment Products Team (HHP department)");
      console.log("- Digital Television Team (DTV department)");
      console.log("\nNo demo accounts created - users must sign up and await approval");
    });

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
