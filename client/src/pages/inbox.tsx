import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  MessageSquare, 
  ExternalLink, 
  Settings,
  AlertCircle,
  Inbox as InboxIcon,
  RefreshCw,
  Clock,
  CheckCircle2,
  MessageCircle,
  Zap,
  Copy,
  Plus,
  Trash2,
  RotateCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ConversationList, { Conversation } from "@/components/conversation-list";
import MessageThread from "@/components/message-thread";

interface ChatwootEmbedInfo {
  embedUrl: string;
  instanceUrl: string;
  accountId: number;
  agentId: number | null;
  ssoEnabled: boolean;
}

interface DepartmentInbox {
  inbox: {
    id: string;
    chatwootInboxId: number;
    chatwootInboxName: string;
    inboxType: string;
  } | null;
  embedUrl: string;
  message?: string;
}

interface IntegrationStatus {
  chatwoot: { configured: boolean; enabled: boolean };
}

interface ConversationStats {
  open: number;
  pending: number;
  resolved: number;
  unassigned: number;
  available: boolean;
  lastUpdated?: string;
}

interface QuickReply {
  id: string;
  title: string;
  content: string;
}

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  {
    id: "1",
    title: "Greeting",
    content: "Hello! Thank you for contacting us. How can I assist you today?",
  },
  {
    id: "2",
    title: "Checking Status",
    content: "I'm looking into this for you now. Please give me a moment to check the details.",
  },
  {
    id: "3",
    title: "Request Info",
    content: "To help you better, could you please provide your order number or account email?",
  },
  {
    id: "4",
    title: "Escalation",
    content: "I'll escalate this to our specialist team. They will get back to you within 24 hours.",
  },
  {
    id: "5",
    title: "Closing",
    content: "Is there anything else I can help you with today? If not, I'll close this conversation.",
  },
];

function StatCard({ title, value, icon: Icon, color }: { 
  title: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className={`p-4 rounded-lg border ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className="h-8 w-8 opacity-50" />
      </div>
    </div>
  );
}

function QuickReplies({ onCopy }: { onCopy: (text: string) => void }) {
  const [replies, setReplies] = useState<QuickReply[]>(() => {
    const saved = localStorage.getItem('quickReplies');
    return saved ? JSON.parse(saved) : DEFAULT_QUICK_REPLIES;
  });
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();

  const saveReplies = (updated: QuickReply[]) => {
    setReplies(updated);
    localStorage.setItem('quickReplies', JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ title: "Error", description: "Please fill in both title and content", variant: "destructive" });
      return;
    }
    const newReply: QuickReply = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
    };
    saveReplies([...replies, newReply]);
    setNewTitle("");
    setNewContent("");
    setShowAdd(false);
    toast({ title: "Quick reply added" });
  };

  const handleDelete = (id: string) => {
    saveReplies(replies.filter(r => r.id !== id));
    toast({ title: "Quick reply deleted" });
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    onCopy(content);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Quick Replies</h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-md bg-muted space-y-2">
          <input
            type="text"
            placeholder="Title (e.g., 'Greeting')"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border bg-background"
          />
          <Textarea
            placeholder="Reply content..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid gap-2 max-h-[300px] overflow-y-auto">
        {replies.map((reply) => (
          <div 
            key={reply.id} 
            className="p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{reply.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{reply.content}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={() => handleCopy(reply.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy to clipboard</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(reply.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotConfiguredState() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Chatwoot Not Configured</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            To view conversations, an administrator needs to configure the Chatwoot integration first.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/integrations"}>
            <Settings className="h-4 w-4 mr-2" />
            Go to Integration Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NoSyncState() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/chatwoot/sync", "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatwoot/conversations"] });
      toast({ title: "Sync complete", description: "Conversations have been synced from Chatwoot" });
      setSyncing(false);
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Failed to sync conversations", variant: "destructive" });
      setSyncing(false);
    },
  });

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <RotateCw className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Conversations Yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Sync conversations from your Chatwoot instance to get started.
          </p>
          <Button onClick={handleSync} disabled={syncing}>
            <RotateCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Inbox() {
  const { teamMember, isManagement } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery<ConversationStats>({
    queryKey: ["/api/integrations/chatwoot/stats"],
    enabled: status?.chatwoot?.configured && status?.chatwoot?.enabled,
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: conversations, isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/chatwoot/conversations"],
    enabled: status?.chatwoot?.configured && status?.chatwoot?.enabled,
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/chatwoot/sync", "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatwoot/conversations"] });
      toast({ title: "Sync complete", description: "Conversations synced from Chatwoot" });
      setSyncing(false);
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Failed to sync conversations", variant: "destructive" });
      setSyncing(false);
    },
  });

  const isLoading = statusLoading;
  const chatwootConfigured = status?.chatwoot?.configured && status?.chatwoot?.enabled;

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  const handleQuickReplyCopy = (text: string) => {
    // Could trigger additional actions when a quick reply is copied
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Inbox</h1>
          <p className="text-muted-foreground mt-1">
            Unified view of all your customer conversations
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {chatwootConfigured && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
              >
                <RotateCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
              {conversations && (
                <Badge variant="secondary" className="gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {conversations.length} conversations
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      ) : !chatwootConfigured ? (
        <NotConfiguredState />
      ) : (
        <div className="space-y-4">
          {/* Statistics Cards */}
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : statsError ? (
            <div className="p-4 rounded-lg border bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                Unable to load conversation statistics. <Button variant="ghost" className="p-0 h-auto underline" onClick={() => refetchStats()}>Retry</Button>
              </p>
            </div>
          ) : stats?.available ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                title="Open" 
                value={stats.open} 
                icon={MessageCircle}
                color="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
              />
              <StatCard 
                title="Pending" 
                value={stats.pending} 
                icon={Clock}
                color="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
              />
              <StatCard 
                title="Resolved" 
                value={stats.resolved} 
                icon={CheckCircle2}
                color="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
              />
              <StatCard 
                title="Total Active" 
                value={stats.open + stats.pending} 
                icon={MessageSquare}
                color="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800"
              />
            </div>
          ) : null}

          {/* Unified Inbox View */}
          {convLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : !conversations || conversations.length === 0 ? (
            <NoSyncState />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
              {/* Conversation List */}
              <div className="lg:col-span-1">
                <ConversationList 
                  onSelectConversation={setSelectedConversation}
                  selectedId={selectedConversation?.id}
                />
              </div>

              {/* Message Thread */}
              <div className="lg:col-span-3">
                {selectedConversation ? (
                  <MessageThread 
                    conversationId={selectedConversation.id}
                    conversation={selectedConversation}
                  />
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto opacity-20 mb-4" />
                      <p className="text-muted-foreground">Select a conversation to view messages</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Quick Replies Sidebar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuickReplies onCopy={handleQuickReplyCopy} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
