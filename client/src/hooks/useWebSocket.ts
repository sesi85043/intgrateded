import { useEffect, useRef, useCallback } from "react";

export interface WebSocketMessage {
  type: string;
  payload: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onTyping?: (data: { userId: string; isTyping: boolean; agentName?: string }) => void;
  onMessageReceived?: (data: any) => void;
  onStatusChanged?: (data: any) => void;
  onAgentStatus?: (data: any) => void;
  onMessageRead?: (data: any) => void;
}

export function useWebSocket(
  conversationId: string,
  userId: string,
  options: UseWebSocketOptions = {}
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host || "localhost:5000";
      const wsUrl = `${protocol}//${host}/ws`;
      console.log("[WebSocket] Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected to server");
        isConnectingRef.current = false;

        // Authenticate with conversation
        ws.send(
          JSON.stringify({
            type: "auth",
            payload: {
              userId,
              conversationId,
              agentId: userId,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          options.onMessage?.(message);

          // Route to specific handlers
          switch (message.type) {
            case "user-typing":
              options.onTyping?.(message.payload);
              break;
            case "message-received":
              options.onMessageReceived?.(message.payload);
              break;
            case "status-updated":
              options.onStatusChanged?.(message.payload);
              break;
            case "agent-status-changed":
              options.onAgentStatus?.(message.payload);
              break;
            case "message-read":
              options.onMessageRead?.(message.payload);
              break;
          }
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected, reconnecting in 3s...");
        isConnectingRef.current = false;
        wsRef.current = null;
        
        // Auto reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        isConnectingRef.current = false;
        ws.close();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      isConnectingRef.current = false;
    }
  }, [conversationId, userId, options]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket] Not connected, message queued");
    }
  }, []);

  const sendTyping = useCallback(
    (isTyping: boolean, agentName?: string) => {
      send({
        type: "typing",
        payload: { isTyping, agentName },
      });
    },
    [send]
  );

  const sendMessageNotification = useCallback(
    (message: any) => {
      send({
        type: "message-sent",
        payload: {
          conversationId,
          message,
          senderId: userId,
          senderType: "agent",
        },
      });
    },
    [send, conversationId, userId]
  );

  const sendStatusChange = useCallback(
    (status: string) => {
      send({
        type: "status-changed",
        payload: {
          conversationId,
          status,
          updatedBy: userId,
        },
      });
    },
    [send, conversationId, userId]
  );

  const markMessageAsRead = useCallback(
    (messageId: string) => {
      send({
        type: "mark-read",
        payload: {
          conversationId,
          messageId,
          readBy: userId,
        },
      });
    },
    [send, conversationId, userId]
  );

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    send,
    sendTyping,
    sendMessageNotification,
    sendStatusChange,
    markMessageAsRead,
  };
}
