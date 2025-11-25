import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Database, MessageSquare, FormInput, Mail, Save, TestTube } from "lucide-react";
import type { ServiceConfig, InsertServiceConfig } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

const platformConfigs = [
  {
    name: "metabase",
    title: "Metabase",
    description: "Business intelligence and analytics platform",
    icon: Database,
    defaultUrl: "https://metabase.yourdomain.com",
  },
  {
    name: "chatwoot",
    title: "Chatwoot",
    description: "Customer engagement and support platform",
    icon: MessageSquare,
    defaultUrl: "https://chatwoot.yourdomain.com",
  },
  {
    name: "typebot",
    title: "Typebot",
    description: "Conversational forms and chatbot builder",
    icon: FormInput,
    defaultUrl: "https://typebot.yourdomain.com",
  },
  {
    name: "mailcow",
    title: "Mailcow",
    description: "Email server management platform",
    icon: Mail,
    defaultUrl: "https://mail.yourdomain.com",
  },
];

export default function Config() {
  const { toast } = useToast();
  const [testingService, setTestingService] = useState<string | null>(null);

  const { data: services, isLoading } = useQuery<ServiceConfig[]>({
    queryKey: ["/api/services"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { serviceName: string; config: InsertServiceConfig }) => {
      const existingService = services?.find(s => s.serviceName === data.serviceName);
      if (existingService) {
        return await apiRequest("PATCH", `/api/services/${existingService.id}`, data.config);
      } else {
        return await apiRequest("POST", "/api/services", data.config);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Configuration saved",
        description: "Service configuration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      return await apiRequest("POST", `/api/services/${serviceName}/test`, undefined);
    },
    onSuccess: (_, serviceName) => {
      toast({
        title: "Connection successful",
        description: `Successfully connected to ${serviceName}.`,
      });
      setTestingService(null);
    },
    onError: (error: Error, serviceName) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Connection failed",
        description: `Failed to connect to ${serviceName}. Check your configuration.`,
        variant: "destructive",
      });
      setTestingService(null);
    },
  });

  const getServiceConfig = (serviceName: string): ServiceConfig | undefined => {
    return services?.find(s => s.serviceName === serviceName);
  };

  const handleSave = (serviceName: string, formData: FormData) => {
    const config: InsertServiceConfig = {
      serviceName,
      apiUrl: formData.get("apiUrl") as string,
      apiKey: formData.get("apiKey") as string,
      enabled: formData.get("enabled") === "true",
    };

    saveMutation.mutate({ serviceName, config });
  };

  const handleTestConnection = (serviceName: string) => {
    setTestingService(serviceName);
    testConnectionMutation.mutate(serviceName);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Configuration</h1>
        <p className="text-muted-foreground mt-1">Configure API connections for all platforms</p>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {platformConfigs.map((platform) => {
          const Icon = platform.icon;
          const serviceConfig = getServiceConfig(platform.name);

          return (
            <AccordionItem
              key={platform.name}
              value={platform.name}
              className="border border-border rounded-md"
            >
              <AccordionTrigger
                className="px-6 hover:no-underline hover-elevate"
                data-testid={`accordion-${platform.name}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{platform.title}</h3>
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSave(platform.name, new FormData(e.currentTarget));
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`${platform.name}-url`}>API URL</Label>
                      <Input
                        id={`${platform.name}-url`}
                        name="apiUrl"
                        type="url"
                        placeholder={platform.defaultUrl}
                        defaultValue={serviceConfig?.apiUrl || ""}
                        data-testid={`input-${platform.name}-url`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${platform.name}-key`}>API Key</Label>
                      <Input
                        id={`${platform.name}-key`}
                        name="apiKey"
                        type="password"
                        placeholder="Enter API key"
                        defaultValue={serviceConfig?.apiKey || ""}
                        data-testid={`input-${platform.name}-key`}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`${platform.name}-enabled`}
                          name="enabled"
                          value="true"
                          defaultChecked={serviceConfig?.enabled ?? true}
                          data-testid={`switch-${platform.name}-enabled`}
                        />
                        <Label htmlFor={`${platform.name}-enabled`} className="cursor-pointer">
                          Enable this service
                        </Label>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        disabled={saveMutation.isPending}
                        data-testid={`button-save-${platform.name}`}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saveMutation.isPending ? "Saving..." : "Save Configuration"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleTestConnection(platform.name)}
                        disabled={testingService === platform.name || !serviceConfig}
                        data-testid={`button-test-${platform.name}`}
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        {testingService === platform.name ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>
                  </form>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>How to obtain API credentials for each platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Metabase</h4>
            <p className="text-sm text-muted-foreground">
              Generate an API key from Settings → Admin → API Keys in your Metabase instance.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Chatwoot</h4>
            <p className="text-sm text-muted-foreground">
              Create an access token from Profile Settings → Access Token in Chatwoot.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Typebot</h4>
            <p className="text-sm text-muted-foreground">
              Generate an API token from your Typebot dashboard settings.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Mailcow</h4>
            <p className="text-sm text-muted-foreground">
              Create an API key from Mailcow Admin → Configuration → API.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
