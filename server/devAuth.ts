import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";

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

export async function setupAuth(app: Express) {
  app.use(getSession());

  app.get("/api/dev-login", async (req: any, res) => {
    await storage.upsertUser(DEV_USER);
    req.session.user = DEV_USER;
    res.redirect("/");
  });

  app.get("/api/auth/user", (req: any, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.get("/api/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  app.get("/api/login", (req, res) => {
    res.redirect("/api/dev-login");
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (req.session?.user) {
    req.user = { claims: { sub: req.session.user.id } };
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
