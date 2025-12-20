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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Save, 
  Plus,
  Trash2,
  Building2,
  Settings,
  Link2
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { Department } from "@shared/schema";

interface DepartmentEmailSettings {
  id: string;
  departmentId: string;
  parentEmail: string;
  imapHost?: string;
  imapPort?: number;
  imapUsername?: string;
  imapPassword?: string;
  imapUseSsl: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpUseTls: boolean;
  enabled: boolean;
}

interface ChatwootInbox {
  id: string;
  departmentId: string;
  chatwootInboxId: number;
  chatwootInboxName: string;
  inboxType: string;
  enabled: boolean;
}

interface ChatwootTeam {
  id: string;
  departmentId: string;
  chatwootTeamId: number;
  chatwootTeamName: string;
  autoAssign: boolean;
}

function DepartmentEmailForm({ department, existingSettings }: { 
  department: Department; 
  existingSettings?: DepartmentEmailSettings | null;
}) {
  const { toast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<DepartmentEmailSettings>) => {
      return await apiRequest("/api/integrations/department-emails", "POST", {
        ...data,
        departmentId: department.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/department-emails"] });
      toast({ title: "Email settings saved", description: `Updated settings for ${department.name}` });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({ title: "Error", description: "Failed to save email settings", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate({
      parentEmail: formData.get("parentEmail") as string,
      imapHost: formData.get("imapHost") as string || undefined,
      imapPort: formData.get("imapPort") ? parseInt(formData.get("imapPort") as string, 10) : undefined,
      imapUsername: formData.get("imapUsername") as string || undefined,
      imapPassword: formData.get("imapPassword") as string || undefined,
      imapUseSsl: formData.get("imapUseSsl") === "on",
      smtpHost: formData.get("smtpHost") as string || undefined,
      smtpPort: formData.get("smtpPort") ? parseInt(formData.get("smtpPort") as string, 10) : undefined,
      smtpUsername: formData.get("smtpUsername") as string || undefined,
      smtpPassword: formData.get("smtpPassword") as string || undefined,
      smtpUseTls: formData.get("smtpUseTls") === "on",
      enabled: formData.get("enabled") === "on",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`email-${department.id}`}>Department Email (Parent Email)</Label>
        <Input
          id={`email-${department.id}`}
          name="parentEmail"
          type="email"
          placeholder={`support.${department.code?.toLowerCase()}@company.com`}
          defaultValue={existingSettings?.parentEmail || ""}
          required
          data-testid={`input-dept-email-${department.id}`}
        />
        <p className="text-xs text-muted-foreground">
          Emails sent to this address will create tickets for this department
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id={`enabled-${department.id}`}
          name="enabled"
          defaultChecked={existingSettings?.enabled ?? true}
          data-testid={`switch-dept-enabled-${department.id}`}
        />
        <Label htmlFor={`enabled-${department.id}`}>Enable email integration</Label>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-muted-foreground"
      >
        <Settings className="h-4 w-4 mr-2" />
        {showAdvanced ? "Hide" : "Show"} Advanced Settings (IMAP/SMTP)
      </Button>

      {showAdvanced && (
        <div className="space-y-4 p-4 rounded-md bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">IMAP Settings (Incoming)</h4>
              <div className="space-y-2">
                <Label htmlFor={`imap-host-${department.id}`}>IMAP Host</Label>
                <Input
                  id={`imap-host-${department.id}`}
                  name="imapHost"
                  placeholder="imap.mail.com"
                  defaultValue={existingSettings?.imapHost || ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor={`imap-port-${department.id}`}>Port</Label>
                  <Input
                    id={`imap-port-${department.id}`}
                    name="imapPort"
                    type="number"
                    placeholder="993"
                    defaultValue={existingSettings?.imapPort || 993}
                  />
                </div>
                <div className="space-y-2 flex items-end gap-2 pb-2">
                  <Switch
                    id={`imap-ssl-${department.id}`}
                    name="imapUseSsl"
                    defaultChecked={existingSettings?.imapUseSsl ?? true}
                  />
                  <Label htmlFor={`imap-ssl-${department.id}`}>Use SSL</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`imap-user-${department.id}`}>Username</Label>
                <Input
                  id={`imap-user-${department.id}`}
                  name="imapUsername"
                  defaultValue={existingSettings?.imapUsername || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`imap-pass-${department.id}`}>Password</Label>
                <Input
                  id={`imap-pass-${department.id}`}
                  name="imapPassword"
                  type="password"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-sm">SMTP Settings (Outgoing)</h4>
              <div className="space-y-2">
                <Label htmlFor={`smtp-host-${department.id}`}>SMTP Host</Label>
                <Input
                  id={`smtp-host-${department.id}`}
                  name="smtpHost"
                  placeholder="smtp.mail.com"
                  defaultValue={existingSettings?.smtpHost || ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor={`smtp-port-${department.id}`}>Port</Label>
                  <Input
                    id={`smtp-port-${department.id}`}
                    name="smtpPort"
                    type="number"
                    placeholder="587"
                    defaultValue={existingSettings?.smtpPort || 587}
                  />
                </div>
                <div className="space-y-2 flex items-end gap-2 pb-2">
                  <Switch
                    id={`smtp-tls-${department.id}`}
                    name="smtpUseTls"
                    defaultChecked={existingSettings?.smtpUseTls ?? true}
                  />
                  <Label htmlFor={`smtp-tls-${department.id}`}>Use TLS</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`smtp-user-${department.id}`}>Username</Label>
                <Input
                  id={`smtp-user-${department.id}`}
                  name="smtpUsername"
                  defaultValue={existingSettings?.smtpUsername || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`smtp-pass-${department.id}`}>Password</Label>
                <Input
                  id={`smtp-pass-${department.id}`}
                  name="smtpPassword"
                  type="password"
                  placeholder="Enter password"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <Button type="submit" disabled={saveMutation.isPending} data-testid={`button-save-dept-${department.id}`}>
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving..." : "Save Email Settings"}
      </Button>
    </form>
  );
}

function ChatwootMappingForm({ department }: { department: Department }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: inboxes = [] } = useQuery<ChatwootInbox[]>({
    queryKey: ["/api/integrations/chatwoot/inboxes"],
  });

  const { data: teams = [] } = useQuery<ChatwootTeam[]>({
    queryKey: ["/api/integrations/chatwoot/teams"],
  });

  const deptInboxes = inboxes.filter(i => i.departmentId === department.id);
  const deptTeams = teams.filter(t => t.departmentId === department.id);

  const createInboxMutation = useMutation({
    mutationFn: async (data: Partial<ChatwootInbox>) => {
      return await apiRequest("/api/integrations/chatwoot/inboxes", "POST", {
        ...data,
        departmentId: department.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/chatwoot/inboxes"] });
      toast({ title: "Inbox mapping created" });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({ title: "Error", description: "Failed to create inbox mapping", variant: "destructive" });
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: Partial<ChatwootTeam>) => {
      return await apiRequest("/api/integrations/chatwoot/teams", "POST", {
        ...data,
        departmentId: department.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/chatwoot/teams"] });
      toast({ title: "Team mapping created" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({ title: "Error", description: "Failed to create team mapping", variant: "destructive" });
    },
  });

  const deleteInboxMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/integrations/chatwoot/inboxes/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/chatwoot/inboxes"] });
      toast({ title: "Inbox mapping removed" });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/integrations/chatwoot/teams/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/chatwoot/teams"] });
      toast({ title: "Team mapping removed" });
    },
  });

  const handleAddInbox = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createInboxMutation.mutate({
      chatwootInboxId: parseInt(formData.get("chatwootInboxId") as string, 10),
      chatwootInboxName: formData.get("chatwootInboxName") as string,
      inboxType: formData.get("inboxType") as string,
      enabled: true,
    });
  };

  const handleAddTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTeamMutation.mutate({
      chatwootTeamId: parseInt(formData.get("chatwootTeamId") as string, 10),
      chatwootTeamName: formData.get("chatwootTeamName") as string,
      autoAssign: formData.get("autoAssign") === "on",
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chatwoot Inboxes
          </h4>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Inbox
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Map Chatwoot Inbox</DialogTitle>
                <DialogDescription>
                  Link a Chatwoot inbox to {department.name}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddInbox} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chatwootInboxId">Chatwoot Inbox ID</Label>
                  <Input
                    id="chatwootInboxId"
                    name="chatwootInboxId"
                    type="number"
                    placeholder="e.g., 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chatwootInboxName">Inbox Name</Label>
                  <Input
                    id="chatwootInboxName"
                    name="chatwootInboxName"
                    placeholder={`${department.name} Support`}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inboxType">Inbox Type</Label>
                  <Select name="inboxType" defaultValue="email">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="web">Web Chat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createInboxMutation.isPending}>
                    {createInboxMutation.isPending ? "Adding..." : "Add Inbox"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {deptInboxes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No inboxes mapped to this department</p>
        ) : (
          <div className="space-y-2">
            {deptInboxes.map((inbox) => (
              <div key={inbox.id} className="flex items-center justify-between p-3 rounded-md bg-muted">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{inbox.chatwootInboxName}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {inbox.chatwootInboxId} | Type: {inbox.inboxType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={inbox.enabled ? "default" : "secondary"}>
                    {inbox.enabled ? "Active" : "Disabled"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteInboxMutation.mutate(inbox.id)}
                    disabled={deleteInboxMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Chatwoot Teams
          </h4>
        </div>

        {deptTeams.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No teams mapped to this department</p>
            <form onSubmit={handleAddTeam} className="flex flex-wrap gap-2">
              <Input
                name="chatwootTeamId"
                type="number"
                placeholder="Team ID"
                className="w-24"
                required
              />
              <Input
                name="chatwootTeamName"
                placeholder="Team Name"
                className="flex-1 min-w-[150px]"
                required
              />
              <div className="flex items-center gap-2">
                <Switch name="autoAssign" id={`auto-assign-${department.id}`} defaultChecked />
                <Label htmlFor={`auto-assign-${department.id}`} className="text-sm">Auto-assign</Label>
              </div>
              <Button type="submit" size="sm" disabled={createTeamMutation.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-2">
            {deptTeams.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-3 rounded-md bg-muted">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{team.chatwootTeamName}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {team.chatwootTeamId} | Auto-assign: {team.autoAssign ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteTeamMutation.mutate(team.id)}
                  disabled={deleteTeamMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DepartmentChannels() {
  const { isManagement, isDepartmentAdmin } = useAuth();

  const { data: departments = [], isLoading: deptLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: emailSettings = [], isLoading: emailLoading } = useQuery<DepartmentEmailSettings[]>({
    queryKey: ["/api/integrations/department-emails"],
  });

  const getEmailSettings = (deptId: string) => 
    emailSettings.find(s => s.departmentId === deptId);

  if (!isManagement && !isDepartmentAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Department Channels</h1>
          <p className="text-muted-foreground mt-1">You need admin permissions to manage department channels.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Department Communication Channels</h1>
        <p className="text-muted-foreground mt-1">
          Configure email addresses and Chatwoot inbox mappings for each department
        </p>
      </div>

      {(deptLoading || emailLoading) ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {departments.map((dept) => {
            const settings = getEmailSettings(dept.id);
            return (
              <AccordionItem
                key={dept.id}
                value={dept.id}
                className="border border-border rounded-md"
              >
                <AccordionTrigger className="px-6 hover:no-underline hover-elevate">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{dept.name}</h3>
                        <Badge variant="outline">{dept.code}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {settings?.parentEmail || "No email configured"}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Configuration
                        </CardTitle>
                        <CardDescription>
                          Configure the department support email address
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <DepartmentEmailForm 
                          department={dept} 
                          existingSettings={settings} 
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          Chatwoot Integration
                        </CardTitle>
                        <CardDescription>
                          Map Chatwoot inboxes and teams to this department
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChatwootMappingForm department={dept} />
                      </CardContent>
                    </Card>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            WhatsApp Channel Mapping
          </CardTitle>
          <CardDescription>
            WhatsApp routing is configured through Typebot flows in the Integrations settings.
            Each Typebot flow can route to a specific department based on customer selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.href = "/integrations"}>
            <Settings className="h-4 w-4 mr-2" />
            Go to Integration Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
