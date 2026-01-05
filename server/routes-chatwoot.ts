/**
 * Chatwoot Integration Routes
 * Phase 1: Sync conversations and messages from Chatwoot to local database
 */

import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  chatwootConfig,
  conversations,
  messages,
  contacts,
  agentAssignments,
  teamMembers,
  insertConversationSchema,
  insertMessageSchema,
  insertContactSchema,
} from "@shared/schema";
import { ChatwootClient } from "./chatwoot-client";
import { isTeamMemberAuthenticated } from "./auth";
import { eq, and, isNull } from "drizzle-orm";
import { log } from "./app";

export default async function registerChatwootRoutes(app: Express) {
  /**
   * GET /api/chatwoot/conversations
   * Fetch all synced conversations from local database
   */
  app.get(
    "/api/chatwoot/conversations",
    isTeamMemberAuthenticated,
    async (req: any, res: Response) => {
      try {
        // Primary query using Drizzle relation helper. In some runtime
        // environments the relation metadata can be missing (e.g. mismatched
        // build artifacts), which throws `TypeError: Cannot read properties
        // of undefined (reading 'referencedTable')`. To be resilient, we
        // attempt the nicer relation-based query first and fall back to a
        // simpler select if it fails.
        try {
          const allConversations = await db.query.conversations.findMany({
            with: {
              contact: true,
            },
            orderBy: (c) => c.lastMessageAt,
            limit: 100,
          });

          return res.json({
            success: true,
            count: allConversations.length,
            data: allConversations,
          });
        } catch (innerErr: any) {
          // Specific known Drizzle error can be handled by falling back
          // to a simpler query so the endpoint remains operational.
          console.warn('[chatwoot] Relation query failed, falling back to simple select:', innerErr?.message || innerErr);

          const rows = await db.select().from(conversations).orderBy(conversations.lastMessageAt).limit(100);

          return res.json({
            success: true,
            count: rows.length,
            data: rows,
          });
        }
      } catch (error) {
        console.error('[chatwoot] Error fetching conversations:', error);
        res.status(500).json({ message: 'Failed to fetch conversations' });
      }
    }
  );

  /**
   * POST /api/chatwoot/sync
   * Manually trigger sync from Chatwoot to local database
   */
  app.post(
    "/api/chatwoot/sync",
    isTeamMemberAuthenticated,
    async (req: any, res: Response) => {
      try {
        // Get Chatwoot config from database
        const config = await db.query.chatwootConfig.findFirst({
          where: (c) => eq(c.enabled, true),
        });

        if (!config) {
          return res.status(400).json({
            message: "Chatwoot is not configured",
          });
        }

        // Initialize Chatwoot client
        const client = new ChatwootClient({
          instanceUrl: config.instanceUrl,
          apiAccessToken: config.apiAccessToken,
          accountId: config.accountId,
        });

        // Fetch conversations from Chatwoot
        const conversationResponse = await client.getConversations(1);
        const chatwootConversations = conversationResponse.data || [];

        log(
          `[chatwoot] Found ${chatwootConversations.length} conversations`,
          "chatwoot-sync"
        );

        let syncedCount = 0;
        let errorCount = 0;

        // Sync each conversation
        for (const conv of chatwootConversations) {
          try {
            // Sync contact first
            const contactData = conv.contact;
            if (contactData) {
              const contact = insertContactSchema.safeParse({
                chatwootContactId: contactData.id,
                name: contactData.name,
                email: contactData.email,
                phone: contactData.phone,
                avatar: contactData.avatar_url,
                timezone: contactData.timezone,
                lastSeenAt: contactData.last_seen_at
                  ? new Date(contactData.last_seen_at)
                  : null,
                metadata: contactData.custom_attributes,
                chatwootData: contactData,
              });

              if (contactData.id && contact.success) {
                await db
                  .insert(contacts)
                  .values({
                    ...contact.data,
                    id: `contact_${contactData.id}`,
                  })
                  .onConflictDoUpdate({
                    target: contacts.chatwootContactId,
                    set: contact.data,
                  });
              }
            }

            // Sync conversation
            const convData = insertConversationSchema.safeParse({
              chatwootConversationId: conv.id,
              inboxId: conv.inbox_id,
              contactId: conv.contact_id,
              channel: conv.inbox?.channel || "web_chat",
              status: conv.status,
              subject: conv.custom_attributes?.subject,
              unreadCount: conv.unread_count || 0,
              lastMessageAt: conv.updated_at
                ? new Date(conv.updated_at)
                : null,
              assignedAgentId: conv.assignee?.id,
              metadata: conv.custom_attributes,
              chatwootData: conv,
            });

            if (convData.success) {
              const result = await db
                .insert(conversations)
                .values({
                  ...convData.data,
                  id: `conv_${conv.id}`,
                })
                .onConflictDoUpdate({
                  target: conversations.chatwootConversationId,
                  set: convData.data,
                });

              // Fetch and sync messages for this conversation
              const messagesResponse = await client.getConversationMessages(
                conv.id,
                1
              );
              const chatwootMessages = messagesResponse.data || [];

              for (const msg of chatwootMessages) {
                const msgData = insertMessageSchema.safeParse({
                  chatwootMessageId: msg.id,
                  conversationId: `conv_${conv.id}`,
                  senderId: msg.sender_id,
                  senderType: msg.sender_type,
                  senderName: msg.sender?.name,
                  content: msg.content,
                  contentType: msg.message_type || "text",
                  attachments: msg.attachments,
                  isPrivate: msg.private || false,
                  status: "sent",
                  chatwootData: msg,
                });

                if (msgData.success) {
                  await db
                    .insert(messages)
                    .values({
                      ...msgData.data,
                      id: `msg_${msg.id}`,
                    })
                    .onConflictDoUpdate({
                      target: messages.chatwootMessageId,
                      set: msgData.data,
                    });
                }
              }

              syncedCount++;
            }
          } catch (error) {
            console.error(
              `[chatwoot] Error syncing conversation ${conv.id}:`,
              error
            );
            errorCount++;
          }
        }

        // Update last sync time
        await db
          .update(chatwootConfig)
          .set({
            lastSyncAt: new Date(),
          })
          .where(eq(chatwootConfig.id, config.id));

        res.json({
          success: true,
          message: `Synced ${syncedCount} conversations (${errorCount} errors)`,
          synced: syncedCount,
          errors: errorCount,
        });
      } catch (error) {
        console.error("[chatwoot] Sync error:", error);
        res.status(500).json({
          message: "Failed to sync Chatwoot conversations",
        });
      }
    }
  );

  /**
   * GET /api/chatwoot/conversations/:id
   * Get a specific conversation with messages
   */
  app.get(
    "/api/chatwoot/conversations/:id",
    isTeamMemberAuthenticated,
    async (req: any, res: Response) => {
      try {
        const { id } = req.params;

        const conversation = await db.query.conversations.findFirst({
          where: (c) => eq(c.id, id),
          with: {
            contact: true,
          },
        });

        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        const conversationMessages = await db.query.messages.findMany({
          where: (m) => eq(m.conversationId, id),
          orderBy: (m) => m.createdAt,
        });

        res.json({
          success: true,
          conversation,
          messages: conversationMessages,
        });
      } catch (error) {
        console.error("[chatwoot] Error fetching conversation:", error);
        res.status(500).json({ message: "Failed to fetch conversation" });
      }
    }
  );

  /**
   * POST /api/chatwoot/conversations/:id/messages
   * Send a message to a conversation through Chatwoot
   */
  app.post(
    "/api/chatwoot/conversations/:id/messages",
    isTeamMemberAuthenticated,
    async (req: any, res: Response) => {
      try {
        const { id } = req.params;
        const { content, isPrivate } = req.body;

        if (!content) {
          return res.status(400).json({ message: "Content is required" });
        }

        // Get conversation from local database
        const conversation = await db.query.conversations.findFirst({
          where: (c) => eq(c.id, id),
        });

        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        // Get Chatwoot config
        const config = await db.query.chatwootConfig.findFirst({
          where: (c) => eq(c.enabled, true),
        });

        if (!config) {
          return res.status(400).json({
            message: "Chatwoot is not configured",
          });
        }

        // Send message through Chatwoot API
        const client = new ChatwootClient({
          instanceUrl: config.instanceUrl,
          apiAccessToken: config.apiAccessToken,
          accountId: config.accountId,
        });

        const result = await client.sendMessage(
          conversation.chatwootConversationId,
          {
            content,
            private: isPrivate || false,
          }
        );

        res.json({
          success: true,
          message: "Message sent",
          data: result,
        });
      } catch (error) {
        console.error("[chatwoot] Error sending message:", error);
        res.status(500).json({
          message: "Failed to send message",
        });
      }
    }
  );

  /**
   * PATCH /api/chatwoot/conversations/:id
   * Update conversation status (open, pending, resolved)
   */
  app.patch(
    "/api/chatwoot/conversations/:id",
    isTeamMemberAuthenticated,
    async (req: any, res: Response) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        // Validate status
        const validStatuses = ["open", "pending", "resolved"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          });
        }

        // Get conversation from local database
        const conversation = await db.query.conversations.findFirst({
          where: (c) => eq(c.id, id),
        });

        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        // Update conversation status locally
        await db
          .update(conversations)
          .set({ status, updatedAt: new Date() })
          .where(eq(conversations.id, id));

        // Get Chatwoot config
        const config = await db.query.chatwootConfig.findFirst({
          where: (c) => eq(c.enabled, true),
        });

        // If configured, also update in Chatwoot
        if (config) {
          const client = new ChatwootClient({
            instanceUrl: config.instanceUrl,
            apiAccessToken: config.apiAccessToken,
            accountId: config.accountId,
          });

          try {
            await client.updateConversationStatus(
              conversation.chatwootConversationId,
              status
            );
          } catch (error) {
            console.error("[chatwoot] Failed to sync status to Chatwoot:", error);
            // Continue anyway - local update succeeded
          }
        }

        // Fetch updated conversation
        const updated = await db.query.conversations.findFirst({
          where: (c) => eq(c.id, id),
          with: { contact: true },
        });

        res.json({
          success: true,
          message: `Conversation status updated to ${status}`,
          data: updated,
        });
      } catch (error) {
        console.error("[chatwoot] Error updating conversation status:", error);
        res.status(500).json({
          message: "Failed to update conversation status",
        });
      }
    }
  );

  /**
   * POST /api/chatwoot/conversations/:id/assign
   * Assign an agent to a conversation
   */
  app.post(
    "/api/chatwoot/conversations/:id/assign",
    isTeamMemberAuthenticated,
    async (req: any, res: Response) => {
      try {
        const { id } = req.params;
        const { teamMemberId } = req.body;

        if (!teamMemberId) {
          return res.status(400).json({ message: "teamMemberId is required" });
        }

        // Verify conversation exists
        const conversation = await db.query.conversations.findFirst({
          where: (c) => eq(c.id, id),
        });

        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        // Verify team member exists
        const member = await db.query.teamMembers.findFirst({
          where: (m) => eq(m.id, teamMemberId),
        });

        if (!member) {
          return res.status(404).json({ message: "Team member not found" });
        }

        // Unassign previous assignment
        await db
          .update(agentAssignments)
          .set({ unassignedAt: new Date() })
          .where(
            and(
              eq(agentAssignments.conversationId, id),
              isNull(agentAssignments.unassignedAt)
            )
          );

        // Create new assignment
        const assignment = await db
          .insert(agentAssignments)
          .values({
            conversationId: id,
            teamMemberId,
            assignedAt: new Date(),
          })
          .returning();

        res.json({
          success: true,
          message: "Agent assigned successfully",
          data: assignment[0],
        });
      } catch (error) {
        console.error("[chatwoot] Error assigning agent:", error);
        res.status(500).json({ message: "Failed to assign agent" });
      }
    }
  );

  /**
   * DELETE /api/chatwoot/conversations/:id/assign
   * Unassign an agent from a conversation
   */
  app.delete(
    "/api/chatwoot/conversations/:id/assign",
    isTeamMemberAuthenticated,
    async (req: any, res: Response) => {
      try {
        const { id } = req.params;

        // Unassign all active assignments
        await db
          .update(agentAssignments)
          .set({ unassignedAt: new Date() })
          .where(
            and(
              eq(agentAssignments.conversationId, id),
              isNull(agentAssignments.unassignedAt)
            )
          );

        res.json({
          success: true,
          message: "Agent unassigned successfully",
        });
      } catch (error) {
        console.error("[chatwoot] Error unassigning agent:", error);
        res.status(500).json({ message: "Failed to unassign agent" });
      }
    }
  );

  /**
   * GET /api/chatwoot/conversations/:id/assigned
   * Get assigned agent for a conversation
   */
  app.get(
    "/api/chatwoot/conversations/:id/assigned",
    isTeamMemberAuthenticated,
    async (req: any, res: Response) => {
      try {
        const { id } = req.params;

        const assignment = await db.query.agentAssignments.findFirst({
          where: (a) =>
            and(
              eq(a.conversationId, id),
              isNull(a.unassignedAt)
            ),
          with: {
            teamMember: true,
          },
        });

        res.json({
          success: true,
          data: assignment || null,
        });
      } catch (error) {
        console.error("[chatwoot] Error fetching assignment:", error);
        res.status(500).json({ message: "Failed to fetch assignment" });
      }
    }
  );

  log("Chatwoot routes registered", "chatwoot");
}
