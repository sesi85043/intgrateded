// API routes for admin dashboard
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertServiceConfigSchema, insertManagedUserSchema } from "@shared/schema";

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
        validatedData.platform,
        { email: validatedData.email, fullName: validatedData.fullName }
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
        user.platform,
        { email: user.email }
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

  const httpServer = createServer(app);
  return httpServer;
}
