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
  insertConversationSchema,
  insertMessageSchema,
  insertContactSchema,
} from "@shared/schema";
import { ChatwootClient } from "./chatwoot-client";
import { isTeamMemberAuthenticated } from "./auth";
import { eq } from "drizzle-orm";
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
        const allConversations = await db.query.conversations.findMany({
          with: {
            contact: true,
          },
          orderBy: (c) => c.lastMessageAt,
          limit: 100,
        });

        res.json({
          success: true,
          count: allConversations.length,
          data: allConversations,
        });
      } catch (error) {
        console.error("[chatwoot] Error fetching conversations:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
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

  log("Chatwoot routes registered", "chatwoot");
}
