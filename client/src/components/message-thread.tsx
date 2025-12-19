import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MessageCircle } from "lucide-react";
import { format } from "date-fns";

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

export default function MessageThread({ conversationId, conversation }: MessageThreadProps) {
  const { data: threadData, isLoading, error } = useQuery<{
    conversation: Conversation;
    messages: Message[];
  }>({
    queryKey: [`/api/chatwoot/conversations/${conversationId}`],
  });

  const messages = threadData?.messages || [];
  const conv = conversation || threadData?.conversation;

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="space-y-2">
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
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{conv.channel.toUpperCase()}</Badge>
            <Badge variant="secondary">{conv.status}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4 pb-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-8 w-8 mx-auto opacity-20 mb-2" />
              <p className="text-sm text-muted-foreground">No messages yet</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isAgent={message.senderType === "agent"}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
