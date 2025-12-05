import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  ExternalLink, 
  Settings,
  AlertCircle,
  Inbox as InboxIcon,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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

function ChatwootEmbed({ embedUrl, title }: { embedUrl: string; title: string }) {
  return (
    <div className="w-full h-full min-h-[600px] border rounded-md overflow-hidden bg-background">
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full min-h-[600px]"
        allow="microphone; camera"
        data-testid="iframe-chatwoot"
      />
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

function NoInboxState({ departmentName }: { departmentName?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <InboxIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Inbox Assigned</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            {departmentName 
              ? `No Chatwoot inbox has been mapped to the ${departmentName} department yet.`
              : "No Chatwoot inbox has been assigned to your department."}
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/department-channels"}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Department Channels
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Inbox() {
  const { teamMember, isManagement } = useAuth();

  const { data: status, isLoading: statusLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  const { data: embedInfo, isLoading: embedLoading } = useQuery<ChatwootEmbedInfo>({
    queryKey: ["/api/integrations/chatwoot/sso-url"],
    enabled: status?.chatwoot?.configured && status?.chatwoot?.enabled,
  });

  const { data: deptInbox, isLoading: inboxLoading } = useQuery<DepartmentInbox>({
    queryKey: ["/api/integrations/chatwoot/department-inbox"],
    enabled: status?.chatwoot?.configured && status?.chatwoot?.enabled,
  });

  const isLoading = statusLoading || embedLoading || inboxLoading;

  const chatwootConfigured = status?.chatwoot?.configured && status?.chatwoot?.enabled;

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Inbox</h1>
          <p className="text-muted-foreground mt-1">
            {isManagement 
              ? "View and manage all customer conversations" 
              : `View conversations for ${teamMember?.departmentName || "your department"}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {deptInbox?.inbox && (
            <Badge variant="outline" className="gap-1">
              <MessageSquare className="h-3 w-3" />
              {deptInbox.inbox.chatwootInboxName}
            </Badge>
          )}
          {embedInfo?.instanceUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(embedInfo.instanceUrl, '_blank')}
              data-testid="button-open-chatwoot"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Chatwoot
            </Button>
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
      ) : !deptInbox?.inbox && !isManagement ? (
        <NoInboxState departmentName={teamMember?.departmentName} />
      ) : (
        <div className="space-y-4">
          {isManagement && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">All Conversations</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Management View</Badge>
                  </div>
                </div>
                <CardDescription>
                  As a manager, you have access to all department conversations
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {embedInfo?.embedUrl ? (
            <ChatwootEmbed 
              embedUrl={isManagement ? embedInfo.embedUrl : (deptInbox?.embedUrl || embedInfo.embedUrl)} 
              title="Chatwoot Inbox"
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 p-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Unable to load Chatwoot</p>
                    <p className="text-sm opacity-80">
                      There was an issue loading the Chatwoot inbox. Please try refreshing the page or contact an administrator.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Chatwoot Account: {embedInfo?.accountId}</span>
                  {embedInfo?.agentId && <span>Agent ID: {embedInfo.agentId}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {embedInfo?.ssoEnabled ? (
                    <Badge variant="default" className="bg-green-600">SSO Enabled</Badge>
                  ) : (
                    <Badge variant="secondary">Manual Login Required</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
