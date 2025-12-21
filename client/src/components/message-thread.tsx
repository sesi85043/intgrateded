import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, MessageCircle, CheckCircle2, Clock, XCircle, UserPlus, X } from "lucide-react";
import { format } from "date-fns";
import MessageComposer from "./message-composer";
import TypingIndicator from "./typing-indicator";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

export interface Message {
  id: string;
  chatwootMessageId: number;
  conversationId: string;
  senderId: number;
  senderType: string;
  senderName?: string;
  content: string;
  contentType: string;
  attachments?: any[];
  isPrivate: boolean;
  status: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  subject?: string;
  channel: string;
  status: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };
}

interface MessageThreadProps {
  conversationId: string;
  conversation?: Conversation;
  onMessageSent?: () => void;
}

function MessageBubble({ message, isAgent }: { message: Message; isAgent: boolean }) {
  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isAgent
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted text-foreground rounded-bl-none"
        }`}
      >
        {message.senderName && !isAgent && (
          <p className="text-xs opacity-70 mb-1">{message.senderName}</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-xs mt-1 opacity-70`}>
          {format(new Date(message.createdAt), "HH:mm")}
        </p>
      </div>
    </div>
  );
}

export default function MessageThread({ 
  conversationId, 
  conversation,
  onMessageSent 
}: MessageThreadProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendNotification, requestPermission } = useNotifications();

  const { data: threadData, isLoading, error, refetch } = useQuery<{
    conversation: Conversation;
    messages: Message[];
  }>({
    queryKey: [`/api/chatwoot/conversations/${conversationId}`],
  });

  const { data: assignmentData, refetch: refetchAssignment } = useQuery<any>({
    queryKey: [`/api/chatwoot/conversations/${conversationId}/assigned`],
  });

  const { data: teamMembers } = useQuery<any[]>({
    queryKey: ["/api/team-members"],
  });

  const assignMutation = useMutation({
    mutationFn: async (teamMemberId: string) => {
      return apiRequest("POST", `/api/chatwoot/conversations/${conversationId}/assign`, {
        teamMemberId,
      });
    },
    onSuccess: () => {
      refetchAssignment();
      toast({
        title: "Success",
        description: "Agent assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign agent",
        variant: "destructive",
      });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/chatwoot/conversations/${conversationId}/assign`, {});
    },
    onSuccess: () => {
      refetchAssignment();
      toast({
        title: "Success",
        description: "Agent unassigned successfully",
      });
    },
  });

  // Setup WebSocket for real-time updates
  const { sendStatusChange, sendMessageNotification, isConnected } = useWebSocket(
    conversationId,
    user?.id || "anonymous",
    {
      onMessageReceived: (data) => {
        // Refresh messages when new message arrives
        refetch();
        // Send notification
        if (data.senderType !== "agent") {
          sendNotification(`New message from ${data.contact?.name || "Customer"}`, {
            body: data.message?.content?.substring(0, 100) || "New message",
            tag: `conversation-${conversationId}`,
          });
        }
      },
      onTyping: (data) => {
        if (data.isTyping) {
          setTypingUsers((prev) => new Set(prev).add(data.userId));
        } else {
          setTypingUsers((prev) => {
            const updated = new Set(prev);
            updated.delete(data.userId);
            return updated;
          });
        }
      },
      onStatusChanged: (data) => {
        // Refresh conversation data on status change
        queryClient.invalidateQueries({
          queryKey: [`/api/chatwoot/conversations/${conversationId}`],
        });
      },
    }
  );

  // Request notification permission on mount
  useEffect(() => {
    requestPermission().catch(() => {
      // User denied, that's ok
    });
  }, [requestPermission]);

  const messages = threadData?.messages || [];
  const conv = conversation || threadData?.conversation;

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(newStatus);
    try {
      await apiRequest("PATCH", `/api/chatwoot/conversations/${conversationId}`, {
        status: newStatus,
      });
      // Refresh conversation data
      const response = await apiRequest("GET", `/api/chatwoot/conversations/${conversationId}`);
      if (response) {
        window.location.reload(); // Reload to get updated status
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">Failed to load messages</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!conv) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Conversation not found</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <MessageCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {conv.contact?.name || "Unknown Contact"}
            </CardTitle>
          </div>
          {conv.contact?.email && (
            <p className="text-sm text-muted-foreground">{conv.contact.email}</p>
          )}
          {conv.contact?.phone && (
            <p className="text-sm text-muted-foreground">{conv.contact.phone}</p>
          )}
          
          {/* Channel and Status Badges with Status Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{conv.channel.toUpperCase()}</Badge>
            <Badge variant="secondary" className="gap-1.5">
              {getStatusIcon(conv.status)}
              {conv.status}
            </Badge>
          </div>

          {/* Status Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={conv.status === "open" ? "default" : "outline"}
              onClick={() => handleStatusChange("open")}
              disabled={updatingStatus !== null}
              className="text-xs gap-1.5"
            >
              <MessageCircle className="h-3 w-3" />
              Open
            </Button>
            <Button
              size="sm"
              variant={conv.status === "pending" ? "default" : "outline"}
              onClick={() => handleStatusChange("pending")}
              disabled={updatingStatus !== null}
              className="text-xs gap-1.5"
            >
              <Clock className="h-3 w-3" />
              Pending
            </Button>
            <Button
              size="sm"
              variant={conv.status === "resolved" ? "default" : "outline"}
              onClick={() => handleStatusChange("resolved")}
              disabled={updatingStatus !== null}
              className="text-xs gap-1.5"
            >
              <CheckCircle2 className="h-3 w-3" />
              Resolved
            </Button>
          </div>

          {/* Agent Assignment */}
          <div className="flex items-center gap-2">
            {assignmentData?.data ? (
              <>
                <Badge variant="outline" className="gap-1.5">
                  <UserPlus className="h-3 w-3" />
                  {assignmentData.data.teamMember?.firstName || "Assigned"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => unassignMutation.mutate()}
                  disabled={unassignMutation.isPending}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Select onValueChange={(memberId) => assignMutation.mutate(memberId)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Assign agent..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers?.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4 pb-0">
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="h-8 w-8 mx-auto opacity-20 mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isAgent={message.senderType === "agent"}
                />
              ))}
            </div>
          )}
        </div>

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <TypingIndicator agentName={Array.from(typingUsers)[0] || "Agent"} />
        )}

        {/* Connection Status */}
        {!isConnected && (
          <div className="text-xs text-amber-600 dark:text-amber-400 px-3 py-1 bg-amber-50 dark:bg-amber-950/30 rounded">
            📡 Reconnecting to live updates...
          </div>
        )}

        {/* Message Composer */}
        <MessageComposer 
          conversationId={conversationId}
          onMessageSent={() => {
            onMessageSent?.();
            sendMessageNotification({ content: "Message sent" });
          }}
        />
      </CardContent>
    </Card>
  );
}
