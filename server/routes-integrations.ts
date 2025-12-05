/**
 * @fileoverview Communication Integration Routes
 * Routes for managing Chatwoot, Evolution API, Typebot, and Mailcow integrations
 */

import type { Express } from "express";
import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  chatwootConfig,
  chatwootTeams,
  chatwootInboxes,
  chatwootAgents,
  evolutionApiConfig,
  whatsappNumbers,
  typebotConfig,
  typebotFlows,
  departmentEmailSettings,
  mailcowConfig,
  managedUsers,
  insertChatwootConfigSchema,
  insertChatwootTeamSchema,
  insertChatwootInboxSchema,
  insertChatwootAgentSchema,
  insertEvolutionApiConfigSchema,
  insertWhatsappNumberSchema,
  insertTypebotConfigSchema,
  insertTypebotFlowSchema,
  insertDepartmentEmailSettingsSchema,
  insertMailcowConfigSchema,
} from "@shared/schema";
import { isTeamMemberAuthenticated } from "./devAuth";
import { requirePermission, requireRoleOrHigher } from "./rbac";
import { PERMISSION_TYPES, ROLE_TYPES } from "@shared/schema";
import { storage } from "./storage";
import { provisioning } from "./provisioning";

export default function registerIntegrationRoutes(app: Express) {
  // ============================================
  // CHATWOOT CONFIGURATION ROUTES
  // ============================================

  // Get Chatwoot configuration
  app.get('/api/integrations/chatwoot/config', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const [config] = await db.select().from(chatwootConfig).limit(1);
      if (!config) {
        return res.json(null);
      }
      // Don't expose the full API token
      const safeConfig = {
        ...config,
        apiAccessToken: config.apiAccessToken ? '••••••••' + config.apiAccessToken.slice(-4) : null,
      };
      res.json(safeConfig);
    } catch (error) {
      console.error("Error fetching Chatwoot config:", error);
      res.status(500).json({ message: "Failed to fetch Chatwoot configuration" });
    }
  });

  // Create or update Chatwoot configuration
  app.post('/api/integrations/chatwoot/config', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { apiAccessToken, webhookSecret, ...otherData } = req.body;
      
      // Check if config already exists
      const [existing] = await db.select().from(chatwootConfig).limit(1);
      
      // Build update data, preserving existing tokens if new ones aren't provided
      const updateData: any = { ...otherData, updatedAt: new Date() };
      
      // Only update apiAccessToken if a new one is provided (non-empty, non-masked)
      if (apiAccessToken && apiAccessToken.trim() && !apiAccessToken.startsWith('••••')) {
        updateData.apiAccessToken = apiAccessToken;
      } else if (!existing) {
        // For new configs, token is required
        return res.status(400).json({ message: "API Access Token is required for new configuration" });
      }
      
      // Only update webhookSecret if a new one is provided
      if (webhookSecret && webhookSecret.trim() && !webhookSecret.startsWith('••••')) {
        updateData.webhookSecret = webhookSecret;
      }
      
      let result;
      if (existing) {
        [result] = await db.update(chatwootConfig)
          .set(updateData)
          .where(eq(chatwootConfig.id, existing.id))
          .returning();
      } else {
        // For new configs, use the provided token
        [result] = await db.insert(chatwootConfig).values({
          ...updateData,
          apiAccessToken: apiAccessToken,
          webhookSecret: webhookSecret || null,
        }).returning();
      }

      await storage.createActivityLog(
        req.teamMember.id,
        existing ? "updated_chatwoot_config" : "created_chatwoot_config",
        "chatwoot_config",
        result.id,
        "chatwoot"
      );

      res.json({ 
        ...result, 
        apiAccessToken: '••••••••' + result.apiAccessToken.slice(-4),
        webhookSecret: result.webhookSecret ? '••••••••' + result.webhookSecret.slice(-4) : null 
      });
    } catch (error) {
      console.error("Error saving Chatwoot config:", error);
      res.status(400).json({ message: "Failed to save Chatwoot configuration" });
    }
  });

  // Test Chatwoot connection
  app.post('/api/integrations/chatwoot/test', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { instanceUrl, apiAccessToken, accountId } = req.body;
      
      // Make a test API call to Chatwoot
      const response = await fetch(`${instanceUrl}/api/v1/accounts/${accountId}/agents`, {
        headers: {
          'api_access_token': apiAccessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return res.status(400).json({ success: false, message: "Connection failed: Invalid credentials or URL" });
      }

      const data = await response.json();
      res.json({ success: true, message: "Connection successful", agentCount: data.length || 0 });
    } catch (error) {
      console.error("Error testing Chatwoot connection:", error);
      res.status(400).json({ success: false, message: "Connection failed: Unable to reach Chatwoot server" });
    }
  });

  // Get Chatwoot teams (mapped to departments)
  app.get('/api/integrations/chatwoot/teams', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const teams = await db.select().from(chatwootTeams);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching Chatwoot teams:", error);
      res.status(500).json({ message: "Failed to fetch Chatwoot teams" });
    }
  });

  // Create Chatwoot team mapping
  app.post('/api/integrations/chatwoot/teams', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const validatedData = insertChatwootTeamSchema.parse(req.body);
      const [team] = await db.insert(chatwootTeams).values(validatedData).returning();
      res.json(team);
    } catch (error) {
      console.error("Error creating Chatwoot team:", error);
      res.status(400).json({ message: "Failed to create Chatwoot team mapping" });
    }
  });

  // Delete Chatwoot team mapping
  app.delete('/api/integrations/chatwoot/teams/:id', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      await db.delete(chatwootTeams).where(eq(chatwootTeams.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting Chatwoot team:", error);
      res.status(400).json({ message: "Failed to delete Chatwoot team mapping" });
    }
  });

  // Get Chatwoot inboxes
  app.get('/api/integrations/chatwoot/inboxes', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const inboxes = await db.select().from(chatwootInboxes);
      res.json(inboxes);
    } catch (error) {
      console.error("Error fetching Chatwoot inboxes:", error);
      res.status(500).json({ message: "Failed to fetch Chatwoot inboxes" });
    }
  });

  // Create Chatwoot inbox mapping
  app.post('/api/integrations/chatwoot/inboxes', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const validatedData = insertChatwootInboxSchema.parse(req.body);
      const [inbox] = await db.insert(chatwootInboxes).values(validatedData).returning();
      res.json(inbox);
    } catch (error) {
      console.error("Error creating Chatwoot inbox:", error);
      res.status(400).json({ message: "Failed to create Chatwoot inbox mapping" });
    }
  });

  // Delete Chatwoot inbox mapping
  app.delete('/api/integrations/chatwoot/inboxes/:id', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      await db.delete(chatwootInboxes).where(eq(chatwootInboxes.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting Chatwoot inbox:", error);
      res.status(400).json({ message: "Failed to delete Chatwoot inbox mapping" });
    }
  });

  // Get Chatwoot agents (linked team members)
  app.get('/api/integrations/chatwoot/agents', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const agents = await db.select().from(chatwootAgents);
      res.json(agents);
    } catch (error) {
      console.error("Error fetching Chatwoot agents:", error);
      res.status(500).json({ message: "Failed to fetch Chatwoot agents" });
    }
  });

  // Sync agents from Chatwoot
  app.post('/api/integrations/chatwoot/sync-agents', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const [config] = await db.select().from(chatwootConfig).limit(1);
      if (!config) {
        return res.status(400).json({ message: "Chatwoot not configured" });
      }

      // Fetch agents from Chatwoot
      const response = await fetch(`${config.instanceUrl}/api/v1/accounts/${config.accountId}/agents`, {
        headers: {
          'api_access_token': config.apiAccessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return res.status(400).json({ message: "Failed to fetch agents from Chatwoot" });
      }

      const chatwootAgentsList = await response.json();
      
      // Update last sync time
      await db.update(chatwootConfig)
        .set({ lastSyncAt: new Date() })
        .where(eq(chatwootConfig.id, config.id));

      res.json({ success: true, agents: chatwootAgentsList, syncedAt: new Date() });
    } catch (error) {
      console.error("Error syncing Chatwoot agents:", error);
      res.status(500).json({ message: "Failed to sync agents from Chatwoot" });
    }
  });

  // ============================================
  // EVOLUTION API CONFIGURATION ROUTES
  // ============================================

  // Get Evolution API configuration
  app.get('/api/integrations/evolution/config', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const [config] = await db.select().from(evolutionApiConfig).limit(1);
      if (!config) {
        return res.json(null);
      }
      const safeConfig = {
        ...config,
        apiKey: config.apiKey ? '••••••••' + config.apiKey.slice(-4) : null,
      };
      res.json(safeConfig);
    } catch (error) {
      console.error("Error fetching Evolution API config:", error);
      res.status(500).json({ message: "Failed to fetch Evolution API configuration" });
    }
  });

  // Create or update Evolution API configuration
  app.post('/api/integrations/evolution/config', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { apiKey, ...otherData } = req.body;
      
      const [existing] = await db.select().from(evolutionApiConfig).limit(1);
      
      // Build update data, preserving existing API key if new one isn't provided
      const updateData: any = { ...otherData, updatedAt: new Date() };
      
      // Only update apiKey if a new one is provided (non-empty, non-masked)
      if (apiKey && apiKey.trim() && !apiKey.startsWith('••••')) {
        updateData.apiKey = apiKey;
      } else if (!existing) {
        return res.status(400).json({ message: "API Key is required for new configuration" });
      }
      
      let result;
      if (existing) {
        [result] = await db.update(evolutionApiConfig)
          .set(updateData)
          .where(eq(evolutionApiConfig.id, existing.id))
          .returning();
      } else {
        [result] = await db.insert(evolutionApiConfig).values({
          ...updateData,
          apiKey: apiKey,
        }).returning();
      }

      await storage.createActivityLog(
        req.teamMember.id,
        existing ? "updated_evolution_config" : "created_evolution_config",
        "evolution_config",
        result.id,
        "evolution_api"
      );

      res.json({ ...result, apiKey: '••••••••' + result.apiKey.slice(-4) });
    } catch (error) {
      console.error("Error saving Evolution API config:", error);
      res.status(400).json({ message: "Failed to save Evolution API configuration" });
    }
  });

  // Test Evolution API connection
  app.post('/api/integrations/evolution/test', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { instanceUrl, apiKey, instanceName } = req.body;
      
      const response = await fetch(`${instanceUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return res.status(400).json({ success: false, message: "Connection failed: Invalid credentials or URL" });
      }

      const data = await response.json();
      res.json({ success: true, message: "Connection successful", instances: data });
    } catch (error) {
      console.error("Error testing Evolution API connection:", error);
      res.status(400).json({ success: false, message: "Connection failed: Unable to reach Evolution API server" });
    }
  });

  // Get connection status and QR code
  app.get('/api/integrations/evolution/status', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const [config] = await db.select().from(evolutionApiConfig).limit(1);
      if (!config) {
        return res.json({ connected: false, message: "Evolution API not configured" });
      }

      // Check connection status
      const response = await fetch(`${config.instanceUrl}/instance/connectionState/${config.instanceName}`, {
        headers: {
          'apikey': config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return res.json({ connected: false, message: "Unable to check connection status" });
      }

      const data = await response.json();
      res.json({
        connected: data.state === 'open',
        state: data.state,
        qrCode: config.qrCodeData,
      });
    } catch (error) {
      console.error("Error checking Evolution status:", error);
      res.status(500).json({ message: "Failed to check Evolution API status" });
    }
  });

  // Get WhatsApp numbers
  app.get('/api/integrations/evolution/numbers', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const numbers = await db.select().from(whatsappNumbers);
      res.json(numbers);
    } catch (error) {
      console.error("Error fetching WhatsApp numbers:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp numbers" });
    }
  });

  // Add WhatsApp number
  app.post('/api/integrations/evolution/numbers', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const validatedData = insertWhatsappNumberSchema.parse(req.body);
      const [number] = await db.insert(whatsappNumbers).values(validatedData).returning();
      res.json(number);
    } catch (error) {
      console.error("Error adding WhatsApp number:", error);
      res.status(400).json({ message: "Failed to add WhatsApp number" });
    }
  });

  // Delete WhatsApp number
  app.delete('/api/integrations/evolution/numbers/:id', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      await db.delete(whatsappNumbers).where(eq(whatsappNumbers.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting WhatsApp number:", error);
      res.status(400).json({ message: "Failed to delete WhatsApp number" });
    }
  });

  // ============================================
  // TYPEBOT CONFIGURATION ROUTES
  // ============================================

  // Get Typebot configuration
  app.get('/api/integrations/typebot/config', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const [config] = await db.select().from(typebotConfig).limit(1);
      if (!config) {
        return res.json(null);
      }
      const safeConfig = {
        ...config,
        apiToken: config.apiToken ? '••••••••' + config.apiToken.slice(-4) : null,
      };
      res.json(safeConfig);
    } catch (error) {
      console.error("Error fetching Typebot config:", error);
      res.status(500).json({ message: "Failed to fetch Typebot configuration" });
    }
  });

  // Create or update Typebot configuration
  app.post('/api/integrations/typebot/config', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const validatedData = insertTypebotConfigSchema.parse(req.body);
      
      const [existing] = await db.select().from(typebotConfig).limit(1);
      
      let result;
      if (existing) {
        [result] = await db.update(typebotConfig)
          .set({ ...validatedData, updatedAt: new Date() })
          .where(eq(typebotConfig.id, existing.id))
          .returning();
      } else {
        [result] = await db.insert(typebotConfig).values(validatedData).returning();
      }

      await storage.createActivityLog(
        req.teamMember.id,
        existing ? "updated_typebot_config" : "created_typebot_config",
        "typebot_config",
        result.id,
        "typebot"
      );

      res.json({ ...result, apiToken: '••••••••' + result.apiToken.slice(-4) });
    } catch (error) {
      console.error("Error saving Typebot config:", error);
      res.status(400).json({ message: "Failed to save Typebot configuration" });
    }
  });

  // Get Typebot flows
  app.get('/api/integrations/typebot/flows', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const flows = await db.select().from(typebotFlows);
      res.json(flows);
    } catch (error) {
      console.error("Error fetching Typebot flows:", error);
      res.status(500).json({ message: "Failed to fetch Typebot flows" });
    }
  });

  // Create Typebot flow mapping
  app.post('/api/integrations/typebot/flows', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const validatedData = insertTypebotFlowSchema.parse(req.body);
      const [flow] = await db.insert(typebotFlows).values(validatedData).returning();
      res.json(flow);
    } catch (error) {
      console.error("Error creating Typebot flow:", error);
      res.status(400).json({ message: "Failed to create Typebot flow mapping" });
    }
  });

  // Delete Typebot flow mapping
  app.delete('/api/integrations/typebot/flows/:id', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      await db.delete(typebotFlows).where(eq(typebotFlows.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting Typebot flow:", error);
      res.status(400).json({ message: "Failed to delete Typebot flow mapping" });
    }
  });

  // ============================================
  // MAILCOW CONFIGURATION ROUTES
  // ============================================

  // Get Mailcow configuration
  app.get('/api/integrations/mailcow/config', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const [config] = await db.select().from(mailcowConfig).limit(1);
      if (!config) {
        return res.json(null);
      }
      const safeConfig = {
        ...config,
        apiKey: config.apiKey ? '••••••••' + config.apiKey.slice(-4) : null,
      };
      res.json(safeConfig);
    } catch (error) {
      console.error("Error fetching Mailcow config:", error);
      res.status(500).json({ message: "Failed to fetch Mailcow configuration" });
    }
  });

  // Create or update Mailcow configuration
  app.post('/api/integrations/mailcow/config', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { apiKey, ...otherData } = req.body;
      
      const [existing] = await db.select().from(mailcowConfig).limit(1);
      
      // Build update data, preserving existing API key if new one isn't provided
      const updateData: any = { ...otherData, updatedAt: new Date() };
      
      // Only update apiKey if a new one is provided (non-empty, non-masked)
      if (apiKey && apiKey.trim() && !apiKey.startsWith('••••')) {
        updateData.apiKey = apiKey;
      } else if (!existing) {
        return res.status(400).json({ message: "API Key is required for new configuration" });
      }
      
      let result;
      if (existing) {
        [result] = await db.update(mailcowConfig)
          .set(updateData)
          .where(eq(mailcowConfig.id, existing.id))
          .returning();
      } else {
        [result] = await db.insert(mailcowConfig).values({
          ...updateData,
          apiKey: apiKey,
        }).returning();
      }

      await storage.createActivityLog(
        req.teamMember.id,
        existing ? "updated_mailcow_config" : "created_mailcow_config",
        "mailcow_config",
        result.id,
        "mailcow"
      );

      res.json({ ...result, apiKey: '••••••••' + result.apiKey.slice(-4) });
    } catch (error) {
      console.error("Error saving Mailcow config:", error);
      res.status(400).json({ message: "Failed to save Mailcow configuration" });
    }
  });

  // Test Mailcow connection
  app.post('/api/integrations/mailcow/test', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { instanceUrl, apiKey } = req.body;
      
      const response = await fetch(`${instanceUrl}/api/v1/get/status/containers`, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return res.status(400).json({ success: false, message: "Connection failed: Invalid credentials or URL" });
      }

      res.json({ success: true, message: "Connection successful" });
    } catch (error) {
      console.error("Error testing Mailcow connection:", error);
      res.status(400).json({ success: false, message: "Connection failed: Unable to reach Mailcow server" });
    }
  });

  // ============================================
  // DEPARTMENT EMAIL SETTINGS ROUTES
  // ============================================

  // Get all department email settings
  app.get('/api/integrations/department-emails', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const settings = await db.select().from(departmentEmailSettings);
      // Mask passwords
      const safeSettings = settings.map(s => ({
        ...s,
        imapPassword: s.imapPassword ? '••••••••' : null,
        smtpPassword: s.smtpPassword ? '••••••••' : null,
      }));
      res.json(safeSettings);
    } catch (error) {
      console.error("Error fetching department email settings:", error);
      res.status(500).json({ message: "Failed to fetch department email settings" });
    }
  });

  // Get department email settings by department ID
  app.get('/api/integrations/department-emails/:departmentId', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const [settings] = await db.select()
        .from(departmentEmailSettings)
        .where(eq(departmentEmailSettings.departmentId, req.params.departmentId));
      
      if (!settings) {
        return res.json(null);
      }

      const safeSettings = {
        ...settings,
        imapPassword: settings.imapPassword ? '••••••••' : null,
        smtpPassword: settings.smtpPassword ? '••••••••' : null,
      };
      res.json(safeSettings);
    } catch (error) {
      console.error("Error fetching department email settings:", error);
      res.status(500).json({ message: "Failed to fetch department email settings" });
    }
  });

  // Create or update department email settings
  app.post('/api/integrations/department-emails', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.DEPARTMENT_ADMIN), async (req: any, res) => {
    try {
      const validatedData = insertDepartmentEmailSettingsSchema.parse(req.body);
      
      // Check if settings exist for this department
      const [existing] = await db.select()
        .from(departmentEmailSettings)
        .where(eq(departmentEmailSettings.departmentId, validatedData.departmentId));
      
      let result;
      if (existing) {
        [result] = await db.update(departmentEmailSettings)
          .set({ ...validatedData, updatedAt: new Date() })
          .where(eq(departmentEmailSettings.id, existing.id))
          .returning();
      } else {
        [result] = await db.insert(departmentEmailSettings).values(validatedData).returning();
      }

      await storage.createActivityLog(
        req.teamMember.id,
        existing ? "updated_department_email" : "created_department_email",
        "department_email_settings",
        result.id,
        undefined,
        { departmentId: validatedData.departmentId }
      );

      const safeResult = {
        ...result,
        imapPassword: result.imapPassword ? '••••••••' : null,
        smtpPassword: result.smtpPassword ? '••••••••' : null,
      };
      res.json(safeResult);
    } catch (error) {
      console.error("Error saving department email settings:", error);
      res.status(400).json({ message: "Failed to save department email settings" });
    }
  });

  // Delete department email settings
  app.delete('/api/integrations/department-emails/:id', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      await db.delete(departmentEmailSettings).where(eq(departmentEmailSettings.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting department email settings:", error);
      res.status(400).json({ message: "Failed to delete department email settings" });
    }
  });

  // ============================================
  // CHATWOOT EMBED / SSO ROUTES
  // ============================================

  // Get Chatwoot SSO URL for embedding
  app.get('/api/integrations/chatwoot/sso-url', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const [config] = await db.select().from(chatwootConfig).limit(1);
      if (!config || !config.enabled) {
        return res.status(400).json({ message: "Chatwoot not configured or disabled" });
      }

      // Get the team member's Chatwoot agent mapping
      const [agentMapping] = await db.select()
        .from(chatwootAgents)
        .where(eq(chatwootAgents.teamMemberId, req.teamMember.id));

      // Build the embed URL
      const embedUrl = `${config.instanceUrl}/app/accounts/${config.accountId}/dashboard`;
      
      res.json({
        embedUrl,
        instanceUrl: config.instanceUrl,
        accountId: config.accountId,
        agentId: agentMapping?.chatwootAgentId || null,
        ssoEnabled: config.ssoEnabled,
      });
    } catch (error) {
      console.error("Error getting Chatwoot SSO URL:", error);
      res.status(500).json({ message: "Failed to get Chatwoot embed URL" });
    }
  });

  // Get department's Chatwoot inbox for filtered view
  app.get('/api/integrations/chatwoot/department-inbox', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      
      // Get inbox mapped to user's department
      const [inbox] = await db.select()
        .from(chatwootInboxes)
        .where(eq(chatwootInboxes.departmentId, member.departmentId));

      if (!inbox) {
        return res.json({ inbox: null, message: "No inbox configured for your department" });
      }

      const [config] = await db.select().from(chatwootConfig).limit(1);
      if (!config) {
        return res.status(400).json({ message: "Chatwoot not configured" });
      }

      res.json({
        inbox,
        embedUrl: `${config.instanceUrl}/app/accounts/${config.accountId}/inbox/${inbox.chatwootInboxId}`,
      });
    } catch (error) {
      console.error("Error getting department inbox:", error);
      res.status(500).json({ message: "Failed to get department inbox" });
    }
  });

  // Get conversation statistics from Chatwoot
  app.get('/api/integrations/chatwoot/stats', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const [config] = await db.select().from(chatwootConfig).limit(1);
      if (!config || !config.enabled) {
        return res.json({ 
          open: 0, 
          pending: 0, 
          resolved: 0, 
          unassigned: 0,
          available: false 
        });
      }

      const member = req.teamMember;
      
      // Get department inbox if not management
      let inboxFilter = '';
      if (member.roleCode !== 'management') {
        const [inbox] = await db.select()
          .from(chatwootInboxes)
          .where(eq(chatwootInboxes.departmentId, member.departmentId));
        if (inbox) {
          inboxFilter = `&inbox_id=${inbox.chatwootInboxId}`;
        }
      }

      // Fetch conversation counts from Chatwoot API
      const fetchConversationCount = async (status: string) => {
        try {
          const response = await fetch(
            `${config.instanceUrl}/api/v1/accounts/${config.accountId}/conversations?status=${status}${inboxFilter}`,
            {
              headers: {
                'api_access_token': config.apiAccessToken,
                'Content-Type': 'application/json',
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            return data.meta?.all_count || data.payload?.length || 0;
          }
          return 0;
        } catch (e) {
          return 0;
        }
      };

      const [open, pending, resolved] = await Promise.all([
        fetchConversationCount('open'),
        fetchConversationCount('pending'),
        fetchConversationCount('resolved'),
      ]);

      res.json({
        open,
        pending,
        resolved,
        unassigned: 0, // Would need separate API call
        available: true,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching Chatwoot stats:", error);
      res.json({ 
        open: 0, 
        pending: 0, 
        resolved: 0, 
        unassigned: 0,
        available: false,
        error: "Failed to fetch statistics" 
      });
    }
  });

  // ============================================
  // INTEGRATION STATUS OVERVIEW
  // ============================================

  // Get status of all integrations
  app.get('/api/integrations/status', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const [chatwoot] = await db.select().from(chatwootConfig).limit(1);
      const [evolution] = await db.select().from(evolutionApiConfig).limit(1);
      const [typebot] = await db.select().from(typebotConfig).limit(1);
      const [mailcow] = await db.select().from(mailcowConfig).limit(1);

      res.json({
        chatwoot: {
          configured: !!chatwoot,
          enabled: chatwoot?.enabled || false,
          lastSync: chatwoot?.lastSyncAt || null,
        },
        evolution: {
          configured: !!evolution,
          enabled: evolution?.enabled || false,
          connectionStatus: evolution?.connectionStatus || 'disconnected',
        },
        typebot: {
          configured: !!typebot,
          enabled: typebot?.enabled || false,
        },
        mailcow: {
          configured: !!mailcow,
          enabled: mailcow?.enabled || false,
          lastSync: mailcow?.lastSyncAt || null,
        },
      });
    } catch (error) {
      console.error("Error fetching integration status:", error);
      res.status(500).json({ message: "Failed to fetch integration status" });
    }
  });

  // ============================================
  // PLATFORM PROVISIONING ROUTES
  // ============================================

  // Provision a team member on external platforms (Mailcow + Chatwoot)
  app.post('/api/integrations/provision/:teamMemberId', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { teamMemberId } = req.params;
      const { createMailbox = true, createChatwootAgent = true, assignToTeam = true } = req.body;

      // Get team member
      const member = await storage.getTeamMember(teamMemberId);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      // Get department
      const department = await storage.getDepartment(member.departmentId);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }

      // Run provisioning
      const result = await provisioning.provisionTeamMember(member, department, {
        createMailbox,
        createChatwootAgent,
        assignToTeam,
      });

      // Log activity
      await storage.createActivityLog(
        req.teamMember.id,
        "provisioned_team_member",
        "team_member",
        teamMemberId,
        undefined,
        {
          username: result.username,
          email: result.generatedEmail,
          mailcowSuccess: result.mailcow?.success,
          chatwootSuccess: result.chatwoot?.success,
        }
      );

      res.json({
        success: true,
        message: "Provisioning completed",
        result,
      });
    } catch (error) {
      console.error("Error provisioning team member:", error);
      res.status(500).json({ message: "Failed to provision team member" });
    }
  });

  // Get provisioning status for a team member
  app.get('/api/integrations/provision/:teamMemberId/status', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { teamMemberId } = req.params;

      // Check Chatwoot agent mapping
      const [chatwootAgent] = await db.select()
        .from(chatwootAgents)
        .where(eq(chatwootAgents.teamMemberId, teamMemberId));

      // Check managed users for platform info
      const [managedUser] = await db.select()
        .from(managedUsers)
        .where(eq(managedUsers.teamMemberId, teamMemberId));

      res.json({
        chatwoot: {
          provisioned: !!chatwootAgent,
          agentId: chatwootAgent?.chatwootAgentId || null,
          email: chatwootAgent?.chatwootAgentEmail || null,
        },
        mailcow: {
          provisioned: managedUser?.platforms?.includes('mailcow') || false,
          email: (managedUser?.platformUserIds as any)?.mailcow || null,
        },
        platforms: managedUser?.platforms || [],
      });
    } catch (error) {
      console.error("Error fetching provisioning status:", error);
      res.status(500).json({ message: "Failed to fetch provisioning status" });
    }
  });

  // Test provisioning connections
  app.post('/api/integrations/provision/test-connections', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const [mailcowResult, chatwootResult] = await Promise.all([
        provisioning.testMailcowConnection(),
        provisioning.testChatwootConnection(),
      ]);

      res.json({
        mailcow: mailcowResult,
        chatwoot: chatwootResult,
      });
    } catch (error) {
      console.error("Error testing provisioning connections:", error);
      res.status(500).json({ message: "Failed to test connections" });
    }
  });

  // Generate Chatwoot SSO URL for current user
  app.get('/api/integrations/chatwoot/sso-login', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      
      // Get Chatwoot agent email for SSO
      const [agentMapping] = await db.select()
        .from(chatwootAgents)
        .where(eq(chatwootAgents.teamMemberId, member.id));

      const ssoEmail = agentMapping?.chatwootAgentEmail || member.email;
      const ssoUrl = await provisioning.getChatwootSSOUrl(ssoEmail);

      if (!ssoUrl) {
        // Fall back to regular embed URL
        const [config] = await db.select().from(chatwootConfig).limit(1);
        if (!config) {
          return res.status(400).json({ message: "Chatwoot not configured" });
        }
        return res.json({
          ssoEnabled: false,
          embedUrl: `${config.instanceUrl}/app/accounts/${config.accountId}/dashboard`,
        });
      }

      res.json({
        ssoEnabled: true,
        ssoUrl,
      });
    } catch (error) {
      console.error("Error generating SSO URL:", error);
      res.status(500).json({ message: "Failed to generate SSO URL" });
    }
  });

  // Preview username that would be generated
  app.post('/api/integrations/provision/preview-username', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { firstName, lastName } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      const [mailcowConf] = await db.select().from(mailcowConfig).limit(1);
      const domain = mailcowConf?.domain || 'mmallelectronics.co.za';

      const username = await provisioning.generateUsername(firstName, lastName, domain);

      res.json({
        username,
        email: `${username}@${domain}`,
        domain,
      });
    } catch (error) {
      console.error("Error previewing username:", error);
      res.status(500).json({ message: "Failed to preview username" });
    }
  });

  // Bulk provision multiple team members
  app.post('/api/integrations/provision/bulk', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { teamMemberIds, createMailbox = true, createChatwootAgent = true } = req.body;

      if (!teamMemberIds || !Array.isArray(teamMemberIds) || teamMemberIds.length === 0) {
        return res.status(400).json({ message: "Team member IDs are required" });
      }

      const results = [];
      for (const teamMemberId of teamMemberIds) {
        const member = await storage.getTeamMember(teamMemberId);
        if (!member) {
          results.push({ teamMemberId, success: false, error: "Member not found" });
          continue;
        }

        const department = await storage.getDepartment(member.departmentId);
        if (!department) {
          results.push({ teamMemberId, success: false, error: "Department not found" });
          continue;
        }

        try {
          const result = await provisioning.provisionTeamMember(member, department, {
            createMailbox,
            createChatwootAgent,
            assignToTeam: true,
          });

          results.push({
            teamMemberId,
            success: true,
            username: result.username,
            email: result.generatedEmail,
            mailcow: result.mailcow,
            chatwoot: result.chatwoot,
          });
        } catch (err) {
          results.push({
            teamMemberId,
            success: false,
            error: err instanceof Error ? err.message : "Provisioning failed",
          });
        }
      }

      // Log activity
      await storage.createActivityLog(
        req.teamMember.id,
        "bulk_provisioned_team_members",
        "team_member",
        undefined,
        undefined,
        { count: teamMemberIds.length, results }
      );

      res.json({
        success: true,
        totalRequested: teamMemberIds.length,
        results,
      });
    } catch (error) {
      console.error("Error bulk provisioning:", error);
      res.status(500).json({ message: "Failed to bulk provision team members" });
    }
  });
}
