import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Phone, 
  Bot, 
  Mail, 
  Save, 
  TestTube, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Settings,
  Link2,
  Shield,
  Server
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";

interface IntegrationStatus {
  chatwoot: { configured: boolean; enabled: boolean; lastSync: string | null };
  evolution: { configured: boolean; enabled: boolean; connectionStatus: string };
  typebot: { configured: boolean; enabled: boolean };
  mailcow: { configured: boolean; enabled: boolean; lastSync: string | null };
  cpanel: { configured: boolean; enabled: boolean };
}

interface ChatwootConfig {
  id?: string;
  instanceUrl: string;
  apiAccessToken: string;
  accountId: number;
  enabled: boolean;
  ssoEnabled: boolean;
  webhookSecret?: string;
}

interface EvolutionConfig {
  id?: string;
  instanceUrl: string;
  apiKey: string;
  instanceName: string;
  enabled: boolean;
  webhookUrl?: string;
}

interface TypebotConfig {
  id?: string;
  instanceUrl: string;
  apiToken: string;
  enabled: boolean;
}

interface MailcowConfig {
  id?: string;
  instanceUrl: string;
  apiKey: string;
  domain: string;
  enabled: boolean;
}

interface CpanelConfig {
  id?: string;
  hostname: string;
  apiToken: string;
  cpanelUsername: string;
  domain: string;
  enabled: boolean;
  connectionStatus?: string;
  lastConnectedAt?: string;
}

interface EvolutionStatus {
  connected: boolean;
  state?: string;
  qrCode?: string;
  message?: string;
}

function StatusBadge({ configured, enabled }: { configured: boolean; enabled: boolean }) {
  if (!configured) {
    return <Badge variant="secondary">Not Configured</Badge>;
  }
  return enabled ? (
    <Badge variant="default" className="bg-green-600">Active</Badge>
  ) : (
    <Badge variant="outline">Disabled</Badge>
  );
}

function SetupGuide({ configured }: { configured: boolean }) {
  const steps = [
    {
      number: 1,
      title: "Get your Chatwoot URL",
      description: "Log into your Chatwoot instance. Copy the URL from your browser (e.g., https://app.chatwoot.com or your self-hosted URL).",
      completed: false,
    },
    {
      number: 2,
      title: "Find your Account ID",
      description: "In Chatwoot, go to Settings > Account Settings. Your Account ID is shown in the URL or on this page.",
      completed: false,
    },
    {
      number: 3,
      title: "Generate an API Access Token",
      description: "In Chatwoot, click your profile icon > Profile Settings > Access Token. Generate a new token and copy it.",
      completed: false,
    },
    {
      number: 4,
      title: "Enter credentials below",
      description: "Fill in the form with your Chatwoot URL, Account ID, and API token. Click 'Test Connection' to verify.",
      completed: configured,
    },
    {
      number: 5,
      title: "Map departments to inboxes",
      description: "After saving, go to Department Channels to link each department to their Chatwoot inbox.",
      completed: false,
    },
  ];

  return (
    <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
          <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Quick Setup Guide</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">Follow these steps to connect Chatwoot</p>
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.number} className="flex items-start gap-3">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
              step.completed 
                ? "bg-green-500 text-white" 
                : "bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
            }`}>
              {step.completed ? <CheckCircle2 className="h-4 w-4" /> : step.number}
            </div>
            <div>
              <p className="font-medium text-sm text-blue-900 dark:text-blue-100">{step.title}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatwootSettings() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const { data: config, isLoading } = useQuery<ChatwootConfig | null>({
    queryKey: ["/api/integrations/chatwoot/config"],
  });

  const { data: status } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ChatwootConfig>) => {
      return await apiRequest("/api/integrations/chatwoot/config", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/chatwoot/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "Chatwoot configuration saved", description: "Your settings have been updated successfully." });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: { instanceUrl: string; apiAccessToken: string; accountId: number }) => {
      return await apiRequest("/api/integrations/chatwoot/test", "POST", data);
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Connection successful", 
        description: `Connected to Chatwoot! Found ${data.agentCount || 0} agents. You can now save your configuration.` 
      });
      setTesting(false);
    },
    onError: () => {
      toast({ title: "Connection failed", description: "Please check your URL, Account ID, and API token are correct.", variant: "destructive" });
      setTesting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate({
      instanceUrl: formData.get("instanceUrl") as string,
      apiAccessToken: formData.get("apiAccessToken") as string,
      accountId: parseInt(formData.get("accountId") as string, 10),
      enabled: formData.get("enabled") === "on",
      ssoEnabled: formData.get("ssoEnabled") === "on",
      webhookSecret: formData.get("webhookSecret") as string || undefined,
    });
  };

  const handleTest = () => {
    const form = document.querySelector('form') as HTMLFormElement;
    if (!form) return;
    const formData = new FormData(form);
    const instanceUrl = formData.get("instanceUrl") as string;
    const apiAccessToken = formData.get("apiAccessToken") as string;
    const accountId = formData.get("accountId") as string;
    
    if (!instanceUrl || !apiAccessToken || !accountId) {
      toast({ title: "Missing fields", description: "Please fill in all required fields before testing", variant: "destructive" });
      return;
    }
    
    setTesting(true);
    testMutation.mutate({
      instanceUrl,
      apiAccessToken,
      accountId: parseInt(accountId, 10),
    });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  }

  const isConfigured = status?.chatwoot?.configured || false;

  return (
    <div className="space-y-6">
      {showGuide && (
        <div className="relative">
          <SetupGuide configured={isConfigured} />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 text-blue-600 dark:text-blue-400"
            onClick={() => setShowGuide(false)}
          >
            Hide Guide
          </Button>
        </div>
      )}
      
      {!showGuide && !isConfigured && (
        <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
          Show Setup Guide
        </Button>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="chatwoot-url">Instance URL</Label>
            <Input
              id="chatwoot-url"
              name="instanceUrl"
              type="url"
              placeholder="https://app.chatwoot.com"
              defaultValue={config?.instanceUrl || ""}
              required
              data-testid="input-chatwoot-url"
            />
            <p className="text-xs text-muted-foreground">
              Your Chatwoot instance URL (cloud or self-hosted)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chatwoot-account">Account ID</Label>
            <Input
              id="chatwoot-account"
              name="accountId"
              type="number"
              placeholder="1"
              defaultValue={config?.accountId || ""}
              required
              data-testid="input-chatwoot-account"
            />
            <p className="text-xs text-muted-foreground">
              Found in Settings &gt; Account Settings
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chatwoot-token">API Access Token</Label>
          <Input
            id="chatwoot-token"
            name="apiAccessToken"
            type="password"
            placeholder={isConfigured ? "Leave blank to keep existing token" : "Enter your Chatwoot API access token"}
            required={!isConfigured}
            data-testid="input-chatwoot-token"
          />
          <p className="text-xs text-muted-foreground">
            {isConfigured 
              ? `Current token: ${config?.apiAccessToken || "••••••••"} (enter new value to change)`
              : "Profile Icon > Profile Settings > Access Token > Generate"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chatwoot-webhook">Webhook Secret (Optional)</Label>
          <Input
            id="chatwoot-webhook"
            name="webhookSecret"
            type="password"
            placeholder={config?.webhookSecret ? "Leave blank to keep existing" : "For receiving real-time updates"}
            data-testid="input-chatwoot-webhook"
          />
          {config?.webhookSecret && (
            <p className="text-xs text-muted-foreground">
              Current: {config.webhookSecret} (enter new value to change)
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="chatwoot-enabled"
              name="enabled"
              defaultChecked={config?.enabled ?? true}
              data-testid="switch-chatwoot-enabled"
            />
            <Label htmlFor="chatwoot-enabled">Enable Chatwoot</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="chatwoot-sso"
              name="ssoEnabled"
              defaultChecked={config?.ssoEnabled ?? false}
              data-testid="switch-chatwoot-sso"
            />
            <Label htmlFor="chatwoot-sso">Enable SSO (Single Sign-On)</Label>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={testing}
            onClick={handleTest}
            data-testid="button-test-chatwoot"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testing ? "Testing..." : "Test Connection"}
          </Button>
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-chatwoot">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>

        {isConfigured && (
          <div className="mt-4 p-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Chatwoot is connected!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Next step: Go to <a href="/department-channels" className="underline font-medium">Department Channels</a> to link departments to Chatwoot inboxes.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

function EvolutionSettings() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const { data: config, isLoading } = useQuery<EvolutionConfig | null>({
    queryKey: ["/api/integrations/evolution/config"],
  });

  const { data: status } = useQuery<EvolutionStatus>({
    queryKey: ["/api/integrations/evolution/status"],
    refetchInterval: 30000,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<EvolutionConfig>) => {
      return await apiRequest("/api/integrations/evolution/config", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/evolution/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "Evolution API configuration saved" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: { instanceUrl: string; apiKey: string; instanceName: string }) => {
      return await apiRequest("/api/integrations/evolution/test", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Connection successful" });
      setTesting(false);
    },
    onError: () => {
      toast({ title: "Connection failed", description: "Check your credentials", variant: "destructive" });
      setTesting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate({
      instanceUrl: formData.get("instanceUrl") as string,
      apiKey: formData.get("apiKey") as string,
      instanceName: formData.get("instanceName") as string,
      enabled: formData.get("enabled") === "on",
      webhookUrl: formData.get("webhookUrl") as string || undefined,
    });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
          {status.connected ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm">WhatsApp Connected</span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-orange-500" />
              <span className="text-sm">WhatsApp Disconnected - Scan QR code to connect</span>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="evolution-url">Instance URL</Label>
          <Input
            id="evolution-url"
            name="instanceUrl"
            type="url"
            placeholder="https://evolution.yourdomain.com"
            defaultValue={config?.instanceUrl || ""}
            required
            data-testid="input-evolution-url"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="evolution-name">Instance Name</Label>
          <Input
            id="evolution-name"
            name="instanceName"
            placeholder="my-instance"
            defaultValue={config?.instanceName || ""}
            required
            data-testid="input-evolution-name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="evolution-key">API Key</Label>
        <Input
          id="evolution-key"
          name="apiKey"
          type="password"
          placeholder={config?.apiKey ? "Leave blank to keep existing key" : "Enter your Evolution API key"}
          required={!config?.apiKey}
          data-testid="input-evolution-key"
        />
        {config?.apiKey && (
          <p className="text-xs text-muted-foreground">
            Current: {config.apiKey} (enter new value to change)
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="evolution-webhook">Webhook URL (Optional)</Label>
        <Input
          id="evolution-webhook"
          name="webhookUrl"
          type="url"
          placeholder="URL for receiving WhatsApp events"
          defaultValue={config?.webhookUrl || ""}
          data-testid="input-evolution-webhook"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="evolution-enabled"
          name="enabled"
          defaultChecked={config?.enabled ?? true}
          data-testid="switch-evolution-enabled"
        />
        <Label htmlFor="evolution-enabled">Enable Evolution API</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-evolution">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={testing}
          onClick={() => {
            const form = document.querySelector('form') as HTMLFormElement;
            const formData = new FormData(form);
            setTesting(true);
            testMutation.mutate({
              instanceUrl: formData.get("instanceUrl") as string,
              apiKey: formData.get("apiKey") as string,
              instanceName: formData.get("instanceName") as string,
            });
          }}
          data-testid="button-test-evolution"
        >
          <TestTube className="h-4 w-4 mr-2" />
          {testing ? "Testing..." : "Test Connection"}
        </Button>
      </div>
    </form>
  );
}

function TypebotSettings() {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<TypebotConfig | null>({
    queryKey: ["/api/integrations/typebot/config"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<TypebotConfig>) => {
      return await apiRequest("/api/integrations/typebot/config", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/typebot/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "Typebot configuration saved" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate({
      instanceUrl: formData.get("instanceUrl") as string,
      apiToken: formData.get("apiToken") as string,
      enabled: formData.get("enabled") === "on",
    });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="typebot-url">Instance URL</Label>
        <Input
          id="typebot-url"
          name="instanceUrl"
          type="url"
          placeholder="https://typebot.yourdomain.com"
          defaultValue={config?.instanceUrl || ""}
          required
          data-testid="input-typebot-url"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="typebot-token">API Token</Label>
        <Input
          id="typebot-token"
          name="apiToken"
          type="password"
          placeholder="Enter your Typebot API token"
          defaultValue={config?.apiToken || ""}
          required
          data-testid="input-typebot-token"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="typebot-enabled"
          name="enabled"
          defaultChecked={config?.enabled ?? true}
          data-testid="switch-typebot-enabled"
        />
        <Label htmlFor="typebot-enabled">Enable Typebot</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-typebot">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  );
}

function MailcowSettings() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const { data: config, isLoading } = useQuery<MailcowConfig | null>({
    queryKey: ["/api/integrations/mailcow/config"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<MailcowConfig>) => {
      return await apiRequest("/api/integrations/mailcow/config", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/mailcow/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "Mailcow configuration saved" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: { instanceUrl: string; apiKey: string }) => {
      return await apiRequest("/api/integrations/mailcow/test", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Connection successful" });
      setTesting(false);
    },
    onError: () => {
      toast({ title: "Connection failed", description: "Check your credentials", variant: "destructive" });
      setTesting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate({
      instanceUrl: formData.get("instanceUrl") as string,
      apiKey: formData.get("apiKey") as string,
      domain: formData.get("domain") as string,
      enabled: formData.get("enabled") === "on",
    });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mailcow-url">Instance URL</Label>
          <Input
            id="mailcow-url"
            name="instanceUrl"
            type="url"
            placeholder="https://mail.yourdomain.com"
            defaultValue={config?.instanceUrl || ""}
            required
            data-testid="input-mailcow-url"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mailcow-domain">Email Domain</Label>
          <Input
            id="mailcow-domain"
            name="domain"
            placeholder="yourdomain.com"
            defaultValue={config?.domain || ""}
            required
            data-testid="input-mailcow-domain"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mailcow-key">API Key</Label>
        <Input
          id="mailcow-key"
          name="apiKey"
          type="password"
          placeholder={config?.apiKey ? "Leave blank to keep existing key" : "Enter your Mailcow API key"}
          required={!config?.apiKey}
          data-testid="input-mailcow-key"
        />
        {config?.apiKey && (
          <p className="text-xs text-muted-foreground">
            Current: {config.apiKey} (enter new value to change)
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="mailcow-enabled"
          name="enabled"
          defaultChecked={config?.enabled ?? true}
          data-testid="switch-mailcow-enabled"
        />
        <Label htmlFor="mailcow-enabled">Enable Mailcow</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-mailcow">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={testing}
          onClick={() => {
            const form = document.querySelector('form') as HTMLFormElement;
            const formData = new FormData(form);
            setTesting(true);
            testMutation.mutate({
              instanceUrl: formData.get("instanceUrl") as string,
              apiKey: formData.get("apiKey") as string,
            });
          }}
          data-testid="button-test-mailcow"
        >
          <TestTube className="h-4 w-4 mr-2" />
          {testing ? "Testing..." : "Test Connection"}
        </Button>
      </div>
    </form>
  );
}

function CpanelSettings() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const { data: config, isLoading } = useQuery<CpanelConfig | null>({
    queryKey: ["/api/integrations/cpanel/config"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<CpanelConfig>) => {
      return await apiRequest("/api/integrations/cpanel/config", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/cpanel/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "cPanel configuration saved", description: "Your settings have been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save configuration", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: { hostname: string; apiToken: string; cpanelUsername: string }) => {
      return await apiRequest("/api/integrations/cpanel/test", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Connection to cPanel successful!" });
      setTesting(false);
    },
    onError: (error: any) => {
      toast({ title: "Connection Failed", description: error.message || "Unable to connect to cPanel", variant: "destructive" });
      setTesting(false);
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <form onSubmit={(e) => { e.preventDefault(); const form = e.target as HTMLFormElement; const formData = new FormData(form); saveMutation.mutate(Object.fromEntries(formData)); }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpanel-hostname">cPanel Hostname</Label>
          <Input
            id="cpanel-hostname"
            name="hostname"
            placeholder="cpanel.yourdomain.com"
            defaultValue={config?.hostname || ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpanel-username">cPanel Username</Label>
          <Input
            id="cpanel-username"
            name="cpanelUsername"
            placeholder="cpanel_username"
            defaultValue={config?.cpanelUsername || ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpanel-domain">Email Domain</Label>
          <Input
            id="cpanel-domain"
            name="domain"
            placeholder="yourdomain.com"
            defaultValue={config?.domain || ""}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cpanel-token">API Token</Label>
        <Input
          id="cpanel-token"
          name="apiToken"
          type="password"
          placeholder={config?.apiToken ? "Leave blank to keep existing token" : "Enter your cPanel API token"}
          required={!config?.apiToken}
        />
        {config?.apiToken && (
          <p className="text-xs text-muted-foreground">
            Current: {config.apiToken} (enter new value to change)
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="cpanel-enabled"
          name="enabled"
          defaultChecked={config?.enabled ?? true}
        />
        <Label htmlFor="cpanel-enabled">Enable cPanel Integration</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={testing}
          onClick={() => {
            const form = document.querySelector('form') as HTMLFormElement;
            const formData = new FormData(form);
            setTesting(true);
            testMutation.mutate({
              hostname: formData.get("hostname") as string,
              apiToken: formData.get("apiToken") as string,
              cpanelUsername: formData.get("cpanelUsername") as string,
            });
          }}
        >
          <TestTube className="h-4 w-4 mr-2" />
          {testing ? "Testing..." : "Test Connection"}
        </Button>
      </div>
    </form>
  );
}

export default function Integrations() {
  const { isManagement } = useAuth();

  const { data: status, isLoading: statusLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Communication Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Configure connections to Chatwoot, WhatsApp, Typebot, email services, and cPanel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="font-medium">Chatwoot</p>
                  <p className="text-xs text-muted-foreground">Chat & Support</p>
                </div>
              </div>
              {statusLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <StatusBadge 
                  configured={status?.chatwoot?.configured || false} 
                  enabled={status?.chatwoot?.enabled || false} 
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="font-medium">Evolution API</p>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                </div>
              </div>
              {statusLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <StatusBadge 
                  configured={status?.evolution?.configured || false} 
                  enabled={status?.evolution?.enabled || false} 
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="font-medium">Typebot</p>
                  <p className="text-xs text-muted-foreground">Chatbot Flows</p>
                </div>
              </div>
              {statusLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <StatusBadge 
                  configured={status?.typebot?.configured || false} 
                  enabled={status?.typebot?.enabled || false} 
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                </div>
                <div>
                  <p className="font-medium">Mailcow</p>
                  <p className="text-xs text-muted-foreground">Email Server</p>
                </div>
              </div>
              {statusLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <StatusBadge 
                  configured={status?.mailcow?.configured || false} 
                  enabled={status?.mailcow?.enabled || false} 
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <Server className="h-5 w-5 text-red-600 dark:text-red-300" />
                </div>
                <div>
                  <p className="font-medium">cPanel</p>
                  <p className="text-xs text-muted-foreground">Email Accounts</p>
                </div>
              </div>
              {statusLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <StatusBadge 
                  configured={status?.cpanel?.configured || false} 
                  enabled={status?.cpanel?.enabled || false} 
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isManagement ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Shield className="h-5 w-5" />
              <p>You need management permissions to configure integrations.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="chatwoot" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chatwoot" className="gap-2" data-testid="tab-chatwoot">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chatwoot</span>
            </TabsTrigger>
            <TabsTrigger value="evolution" className="gap-2" data-testid="tab-evolution">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Evolution</span>
            </TabsTrigger>
            <TabsTrigger value="typebot" className="gap-2" data-testid="tab-typebot">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Typebot</span>
            </TabsTrigger>
            <TabsTrigger value="mailcow" className="gap-2" data-testid="tab-mailcow">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Mailcow</span>
            </TabsTrigger>
            <TabsTrigger value="cpanel" className="gap-2" data-testid="tab-cpanel">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">cPanel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chatwoot">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chatwoot Configuration
                </CardTitle>
                <CardDescription>
                  Connect to your Chatwoot instance for customer support and chat management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChatwootSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evolution">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Evolution API Configuration
                </CardTitle>
                <CardDescription>
                  Connect to Evolution API for WhatsApp messaging integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EvolutionSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="typebot">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Typebot Configuration
                </CardTitle>
                <CardDescription>
                  Connect to Typebot for automated chat flows and routing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TypebotSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mailcow">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Mailcow Configuration
                </CardTitle>
                <CardDescription>
                  Connect to your Mailcow email server for email management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MailcowSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cpanel">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  cPanel Configuration
                </CardTitle>
                <CardDescription>
                  Configure cPanel for automated email account creation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CpanelSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Integration Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">1</div>
            <div>
              <p className="font-medium">Email Flow (Mailcow to Chatwoot)</p>
              <p className="text-sm text-muted-foreground">Emails to department addresses are forwarded to Chatwoot inboxes</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">2</div>
            <div>
              <p className="font-medium">WhatsApp Flow (Evolution to Typebot to Chatwoot)</p>
              <p className="text-sm text-muted-foreground">WhatsApp messages go through Typebot for routing, then to Chatwoot</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">3</div>
            <div>
              <p className="font-medium">Department Routing</p>
              <p className="text-sm text-muted-foreground">Conversations are assigned to department teams based on inbox or Typebot selection</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
