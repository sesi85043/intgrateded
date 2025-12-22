/**
 * @fileoverview Managed Users page
 * Copyright (c) 2025 DevPulse.Inc
 * Designed for MM ALL ELECTRONICS
 *
 * Description: Manage platform users and mappings to internal team members.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertManagedUserSchema, type ManagedUser, type InsertManagedUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, UserX, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Users() {
  const { toast } = useToast();
  type GeneratedEmail = { email: string; password: string } | null;
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail>(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  const { data: users, isLoading } = useQuery<ManagedUser[]>({
    queryKey: ["/api/users"],
  });

  // Use a flexible form type so we can include UI-only fields (provisionMailbox)
  const form = useForm<any>({
    resolver: zodResolver(insertManagedUserSchema),
    defaultValues: {
      email: "",
      fullName: "",
      platforms: [],
      status: "active",
      platformUserIds: {},
      roles: {},
      teamMemberId: "",
      provisionMailbox: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertManagedUser) => {
      return await apiRequest("/api/users", "POST", data);
    },
    onSuccess: (resp: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
      // If backend returned generatedEmail (mailbox provisioning), show modal
      try {
        if (resp && resp.generatedEmail) {
          setGeneratedEmail(resp.generatedEmail);
          setShowProvisionModal(true);
        }
      } catch (e) {
        console.warn('No generatedEmail in response', e);
      }
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
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load team members for the dropdown so admin can attach a managed user to a team member
  const { data: teamMembers } = useQuery({
    queryKey: ["/api/team-members"],
    queryFn: async () => await apiRequest("/api/team-members", "GET"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertManagedUser }) => {
      return await apiRequest(`/api/users/${id}`, "PATCH", data);
    },
    onSuccess: (resp: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      form.reset();
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
      try {
        if (resp && resp.generatedEmail) {
          setGeneratedEmail(resp.generatedEmail);
          setShowProvisionModal(true);
        }
      } catch (e) {
        console.warn("No generatedEmail in update response", e);
      }
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
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/users/${id}`, "DELETE", undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDeletingUser(null);
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
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
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === "all" || (Array.isArray(user.platforms) && user.platforms.includes(platformFilter));
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const handleCreate = () => {
    form.reset({
      email: "",
      fullName: "",
      platforms: [],
      status: "active",
      platformUserIds: {},
      roles: {},
      teamMemberId: "",
      provisionMailbox: true,
    });
    setIsCreateOpen(true);
  };

  const handleEdit = (user: ManagedUser) => {
    form.reset({
      email: user.email,
      fullName: user.fullName,
      platforms: Array.isArray(user.platforms) ? user.platforms : [],
      status: user.status,
      platformUserIds: user.platformUserIds || {},
      roles: user.roles || {},
      teamMemberId: (user as any).teamMemberId || "",
      // default to false when editing to avoid accidental reprovision
      provisionMailbox: false,
    });
    setEditingUser(user);
  };

  const onSubmit = (data: InsertManagedUser) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage users across all platforms</p>
        </div>
        <Button onClick={handleCreate} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-platform-filter">
            <SelectValue placeholder="Filter by platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="metabase">Metabase</SelectItem>
            <SelectItem value="chatwoot">Chatwoot</SelectItem>
            <SelectItem value="typebot">Typebot</SelectItem>
            <SelectItem value="mailcow">Mailcow</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredUsers && filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {Array.isArray(user.platforms) && user.platforms.length > 0 ? (
                        user.platforms.map((platform) => (
                          <Badge key={platform} variant="outline" className="capitalize">
                            {platform}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                      {/* Mailbox indicator */}
                      {(user.platformUserIds && (user.platformUserIds as any).mailcow) && (
                        <Badge variant="secondary">Mailbox</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{typeof user.roles === 'object' && user.roles ? Object.keys(user.roles)[0] || "N/A" : "N/A"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "active"
                          ? "default"
                          : user.status === "suspended"
                          ? "destructive"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(user)}
                        data-testid={`button-edit-${user.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingUser(user)}
                        data-testid={`button-delete-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UserX className="h-12 w-12 opacity-50" />
                    <p>No users found</p>
                    {(searchQuery || platformFilter !== "all" || statusFilter !== "all") && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSearchQuery("");
                          setPlatformFilter("all");
                          setStatusFilter("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingUser} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingUser(null);
          form.reset();
        }
      }}>
        <DialogContent data-testid="dialog-user-form">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user information" : "Add a new user to the platform"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" data-testid="input-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john@example.com" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="platforms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platforms</FormLabel>
                    <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                      {["metabase", "chatwoot", "typebot", "mailcow"].map((platform) => (
                        <div key={platform} className="flex items-center space-x-2">
                          <Checkbox
                            id={`platform-${platform}`}
                            checked={Array.isArray(field.value) && field.value.includes(platform)}
                            onCheckedChange={(checked) => {
                              const currentPlatforms = Array.isArray(field.value) ? field.value : [];
                              if (checked) {
                                field.onChange([...currentPlatforms, platform]);
                              } else {
                                field.onChange(currentPlatforms.filter((p) => p !== platform));
                              }
                            }}
                            data-testid={`checkbox-platform-${platform}`}
                          />
                          <label
                            htmlFor={`platform-${platform}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                          >
                            {platform}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Team Member (optional) */}
              <FormField
                control={form.control}
                name="teamMemberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Member (optional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-team-member">
                          <SelectValue placeholder="Link to a team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none_selected">None</SelectItem>
                        {Array.isArray(teamMembers) && teamMembers.map((tm: any) => (
                          <SelectItem key={tm.id} value={tm.id}>{tm.firstName} {tm.lastName} — {tm.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Provision mailbox toggle */}
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    id="provision-mailbox"
                    checked={!!form.watch('provisionMailbox')}
                    onCheckedChange={(val) => form.setValue('provisionMailbox', !!val)}
                    data-testid="checkbox-provision-mailbox"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel htmlFor="provision-mailbox">Provision Mailbox (Mailcow)</FormLabel>
                  <p className="text-xs text-muted-foreground">Automatically create an email account on the platform</p>
                </div>
              </FormItem>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingUser(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-user"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingUser ? "Update User" : "Create User")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingUser?.fullName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingUser(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Provisioned Email Modal */}
        <Dialog open={showProvisionModal} onOpenChange={(open) => { if (!open) { setShowProvisionModal(false); setGeneratedEmail(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Email Provisioned</DialogTitle>
              <DialogDescription>
                This password will only be shown once. Copy or download the credentials now.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <div className="flex items-center justify-between gap-4">
                  <code className="break-all">{generatedEmail?.email}</code>
                  <div className="flex gap-2">
                    <Button onClick={async () => { if (generatedEmail?.email) { await navigator.clipboard.writeText(generatedEmail.email); toast({ title: 'Copied', description: 'Email copied to clipboard' }); } }}>Copy</Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Password</label>
                <div className="flex items-center justify-between gap-4">
                  <code className="break-all">{generatedEmail?.password}</code>
                  <div className="flex gap-2">
                    <Button onClick={async () => { if (generatedEmail?.password) { await navigator.clipboard.writeText(generatedEmail.password); toast({ title: 'Copied', description: 'Password copied to clipboard' }); } }}>Copy</Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={() => {
                  // download CSV
                  if (!generatedEmail) return;
                  const content = `email,password\n${generatedEmail.email},${generatedEmail.password}\n`;
                  const blob = new Blob([content], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `credentials-${generatedEmail.email.replace(/[@]/g, '-')}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}>Download</Button>
                <Button onClick={() => { setShowProvisionModal(false); setGeneratedEmail(null); }}>Done</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
