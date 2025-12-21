/**
 * WebSocket Server for Real-time Updates
 * Handles live message updates, typing indicators, agent presence, and notifications
 */

import { Server as HTTPServer } from "http";
import { WebSocketServer } from "ws";
import { log } from "./app";

interface ClientConnection {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  agentId?: string;
}

// Map to track active connections with their WebSocket instances
const activeConnections = new Map<string, ClientConnection & { ws: any }>();

export function setupWebSocket(httpServer: HTTPServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws", noServer: false });

  wss.on("connection", (ws) => {
    log("WebSocket client connected", "websocket");

    const clientId = Math.random().toString(36).substring(7);

    ws.on("message", async (data: string) => {
      try {
        const message = JSON.parse(data);
        const { type, payload } = message;

        switch (type) {
          case "auth":
            // Register the connection with user and conversation info
            activeConnections.set(clientId, {
              userId: payload.userId,
              conversationId: payload.conversationId,
              isTyping: false,
              agentId: payload.agentId,
              ws,
            });
            log(
              `User ${payload.userId} subscribed to conversation ${payload.conversationId}`,
              "websocket"
            );
            
            // Confirm auth
            ws.send(JSON.stringify({ type: "auth-ok" }));
            break;

          case "typing":
            // Broadcast typing indicator to conversation subscribers
            const conn = activeConnections.get(clientId);
            if (conn) {
              conn.isTyping = payload.isTyping;
              broadcastToConversation(conn.conversationId, {
                type: "user-typing",
                payload: {
                  userId: conn.userId,
                  conversationId: conn.conversationId,
                  isTyping: payload.isTyping,
                  agentName: payload.agentName,
                },
              });
            }
            break;

          case "message-sent":
            // Broadcast new message to conversation subscribers
            broadcastToConversation(payload.conversationId, {
              type: "message-received",
              payload: {
                conversationId: payload.conversationId,
                message: payload.message,
                senderId: payload.senderId,
                senderType: payload.senderType,
                timestamp: new Date().toISOString(),
              },
            });
            break;

          case "status-changed":
            // Broadcast status change
            broadcastToConversation(payload.conversationId, {
              type: "status-updated",
              payload: {
                conversationId: payload.conversationId,
                status: payload.status,
                updatedBy: payload.updatedBy,
              },
            });
            break;

          case "agent-status":
            // Broadcast agent online/offline status
            broadcastToAll({
              type: "agent-status-changed",
              payload: {
                agentId: payload.agentId,
                status: payload.status, // "online" | "offline" | "away"
                agentName: payload.agentName,
              },
            });
            break;

          case "mark-read":
            // Broadcast read receipt
            broadcastToConversation(payload.conversationId, {
              type: "message-read",
              payload: {
                conversationId: payload.conversationId,
                messageId: payload.messageId,
                readBy: payload.readBy,
              },
            });
            break;

          default:
            log(`Unknown message type: ${type}`, "websocket");
        }
      } catch (error) {
        log(`Error processing WebSocket message: ${error}`, "websocket");
      }
    });

    ws.on("close", () => {
      const conn = activeConnections.get(clientId);
      if (conn) {
        log(
          `User ${conn.userId} disconnected from conversation ${conn.conversationId}`,
          "websocket"
        );
        activeConnections.delete(clientId);

        // Broadcast offline status if agent
        if (conn.agentId) {
          // Check if user has other connections
          const otherConnections = Array.from(activeConnections.values()).some(
            (c) => c.userId === conn.userId
          );
          if (!otherConnections) {
            broadcastToAll({
              type: "agent-status-changed",
              payload: {
                agentId: conn.agentId,
                status: "offline",
              },
            });
          }
        }
      }
    });

    ws.on("error", (error) => {
      log(`WebSocket error: ${error}`, "websocket");
    });
  });

  return wss;
}

/**
 * Broadcast message to all clients subscribed to a conversation
 */
function broadcastToConversation(conversationId: string, message: any) {
  const clients = Array.from(activeConnections.entries()).filter(
    ([_, conn]) => conn.conversationId === conversationId
  );

  log(
    `Broadcasting to ${clients.length} clients in conversation ${conversationId}`,
    "websocket"
  );

  const messageStr = JSON.stringify(message);
  clients.forEach(([_, conn]) => {
    try {
      if (conn.ws.readyState === 1) { // WebSocket.OPEN
        conn.ws.send(messageStr);
      }
    } catch (error) {
      log(`Error sending to client: ${error}`, "websocket");
    }
  });
}

/**
 * Broadcast message to all connected clients
 */
function broadcastToAll(message: any) {
  log(
    `Broadcasting to all ${activeConnections.size} connected clients`,
    "websocket"
  );
  
  const messageStr = JSON.stringify(message);
  activeConnections.forEach(([_, conn]) => {
    try {
      if (conn.ws.readyState === 1) { // WebSocket.OPEN
        conn.ws.send(messageStr);
      }
    } catch (error) {
      log(`Error broadcasting: ${error}`, "websocket");
    }
  });
}

/**
 * Get active agents
 */
export function getActiveAgents() {
  const agents = new Map<string, { status: string; name?: string }>();
  Array.from(activeConnections.values()).forEach((conn) => {
    if (conn.agentId && !agents.has(conn.agentId)) {
      agents.set(conn.agentId, { status: "online" });
    }
  });
  return agents;
}

/**
 * Get active connections for a conversation
 */
export function getConversationConnections(conversationId: string) {
  return Array.from(activeConnections.values()).filter(
    (conn) => conn.conversationId === conversationId
  );
}
