import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";
import { getTeamMemberWithPermissions, seedRolesAndPermissions, seedDefaultDepartments, type AuthenticatedTeamMember } from "./rbac";
import { db } from "./db";
import { roles, teamMembers, departments, ROLE_TYPES } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

declare module "express-session" {
  interface SessionData {
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
    };
    teamMemberId?: string;
  }
}

const DEV_USER = {
  id: "dev-user-123",
  email: "admin@localhost.dev",
  firstName: "Admin",
  lastName: "User",
  profileImageUrl: null,
};

export function getSession() {
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

async function ensureDevTeamMember(): Promise<string | null> {
  await seedRolesAndPermissions();
  await seedDefaultDepartments();

  const existingMember = await storage.getTeamMemberByEmail(DEV_USER.email);
  if (existingMember) {
    return existingMember.id;
  }

  const [mgmtRole] = await db.select().from(roles).where(eq(roles.code, ROLE_TYPES.MANAGEMENT));
  const [dept] = await db.select().from(departments).limit(1);

  if (!mgmtRole || !dept) {
    console.error("Cannot create dev team member: missing role or department");
    return null;
  }

  const passwordHash = await bcrypt.hash("devpassword", 10);
  const member = await storage.createTeamMember({
    userId: DEV_USER.id,
    departmentId: dept.id,
    roleId: mgmtRole.id,
    email: DEV_USER.email,
    firstName: DEV_USER.firstName || "Admin",
    lastName: DEV_USER.lastName || "User",
    role: "management",
    passwordHash,
    status: "active",
  });

  return member.id;
}

export async function setupAuth(app: Express) {
  app.use(getSession());

  app.get("/api/dev-login", async (req: any, res) => {
    await storage.upsertUser(DEV_USER);
    const teamMemberId = await ensureDevTeamMember();
    req.session.user = DEV_USER;
    req.session.teamMemberId = teamMemberId || undefined;
    res.redirect("/");
  });

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const member = await storage.getTeamMemberByEmail(email);
      if (!member) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (member.status !== "active") {
        return res.status(401).json({ message: "Account is deactivated" });
      }

      if (!member.isVerified) {
        return res.status(401).json({ message: "Account is pending admin approval" });
      }

      if (!member.passwordHash) {
        return res.status(401).json({ message: "Password not set for this account" });
      }

      const isValid = await bcrypt.compare(password, member.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await storage.updateTeamMember(member.id, { lastLoginAt: new Date() } as any);

      const user = {
        id: member.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        profileImageUrl: null,
      };

      req.session.user = user;
      req.session.teamMemberId = member.id;

      const memberWithPerms = await getTeamMemberWithPermissions(member.id);
      
      res.json({ 
        user,
        teamMember: memberWithPerms,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/user", async (req: any, res) => {
    if (req.session.user) {
      let teamMember: AuthenticatedTeamMember | null = null;
      
      if (req.session.teamMemberId) {
        teamMember = await getTeamMemberWithPermissions(req.session.teamMemberId);
      }

      res.json({
        ...req.session.user,
        teamMember,
      });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.get("/api/auth/me", async (req: any, res) => {
    if (!req.session.teamMemberId) {
      return res.status(401).json({ message: "Not authenticated as team member" });
    }

    const teamMember = await getTeamMemberWithPermissions(req.session.teamMemberId);
    if (!teamMember) {
      return res.status(401).json({ message: "Team member not found" });
    }

    res.json(teamMember);
  });

  app.get("/api/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  app.post("/api/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/login", (req, res) => {
    res.redirect("/api/dev-login");
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (req.session?.user) {
    req.user = { claims: { sub: req.session.user.id } };
    
    if (req.session.teamMemberId) {
      const teamMember = await getTeamMemberWithPermissions(req.session.teamMemberId);
      if (teamMember) {
        req.teamMember = teamMember;
      }
    }
    
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export const isTeamMemberAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.teamMemberId) {
    return res.status(401).json({ message: "Team member authentication required" });
  }

  const teamMember = await getTeamMemberWithPermissions(req.session.teamMemberId);
  if (!teamMember) {
    return res.status(401).json({ message: "Team member not found" });
  }

  if (teamMember.status !== "active") {
    return res.status(401).json({ message: "Account is deactivated" });
  }

  req.teamMember = teamMember;
  req.user = { claims: { sub: req.session.user?.id } };
  
  next();
};
