import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export interface Conversation {
  id: string;
  chatwootConversationId: number;
  channel: string;
  status: string;
  subject?: string;
  unreadCount: number;
  lastMessageAt?: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string;
}

function ChannelBadge({ channel }: { channel: string }) {
  const badgeConfig: Record<string, { bg: string; text: string; label: string }> = {
    whatsapp: { bg: "bg-green-100 dark:bg-green-900", text: "text-green-800 dark:text-green-200", label: "WhatsApp" },
    email: { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-800 dark:text-blue-200", label: "Email" },
    web_chat: { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-800 dark:text-purple-200", label: "Chat" },
  };

  const config = badgeConfig[channel] || badgeConfig.web_chat;
  return (
    <Badge variant="secondary" className={`${config.bg} ${config.text} border-0`}>
      {config.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    snoozed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  return (
    <Badge variant="secondary" className={colors[status] || colors.open + " border-0"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function ConversationList({ onSelectConversation, selectedId }: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: conversations, isLoading, error } = useQuery<Conversation[]>({
    queryKey: ["/api/chatwoot/conversations"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const filtered = conversations?.filter((conv) => {
    const searchLower = searchTerm.toLowerCase();
    const name = conv.contact?.name || "";
    const email = conv.contact?.email || "";
    const phone = conv.contact?.phone || "";
    const subject = conv.subject || "";

    return (
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      phone.includes(searchLower) ||
      subject.toLowerCase().includes(searchLower)
    );
  });

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to load conversations</p>
              <p className="text-sm opacity-80">Please ensure Chatwoot is configured and synced</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Conversations</CardTitle>
          {conversations && <Badge variant="secondary">{conversations.length}</Badge>}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-2 p-0 px-6 pb-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <MessageSquare className="h-8 w-8 mx-auto opacity-20 mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "No conversations match your search" : "No conversations synced yet"}
              </p>
            </div>
          </div>
        ) : (
          filtered.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedId === conversation.id
                  ? "bg-primary/10 border-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="space-y-2">
                {/* Contact Name & Unread Badge */}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate">
                    {conversation.contact?.name || "Unknown Contact"}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white">{conversation.unreadCount}</Badge>
                  )}
                </div>

                {/* Contact Details */}
                <div className="text-xs text-muted-foreground space-y-1">
                  {conversation.contact?.email && (
                    <p className="truncate">{conversation.contact.email}</p>
                  )}
                  {conversation.contact?.phone && (
                    <p className="truncate">{conversation.contact.phone}</p>
                  )}
                </div>

                {/* Subject if exists */}
                {conversation.subject && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {conversation.subject}
                  </p>
                )}

                {/* Channel, Status, and Last Message Time */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={conversation.channel} />
                    <StatusBadge status={conversation.status} />
                  </div>
                  {conversation.lastMessageAt && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(conversation.lastMessageAt), "HH:mm")}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
