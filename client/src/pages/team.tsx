/**
 * @fileoverview Team management page
 * Copyright (c) 2025 DevPulse.Inc
 * Designed for MM ALL ELECTRONICS
 *
 * Description: UI for listing and managing team members.
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { TeamMember, Department, Role } from "@shared/schema";

export default function Team() {
  const { toast } = useToast();
  const { teamMember, isManagement, isDepartmentAdmin, hasPermission, PERMISSION_TYPES } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [filterDept, setFilterDept] = useState<string>("all");
  const [formData, setFormData] = useState({
    departmentId: "",
    roleId: "",
    employeeId: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "technician",
    phone: "",
    status: "active",
    password: "",
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: managedUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: allMembers = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const canManageUsers = hasPermission(PERMISSION_TYPES.MANAGE_GLOBAL_USERS) || hasPermission(PERMISSION_TYPES.MANAGE_DEPARTMENT_USERS);
  const canManageAllDepts = hasPermission(PERMISSION_TYPES.MANAGE_GLOBAL_USERS);

  const filteredMembers = (() => {
    let result = allMembers;
    
    if (!isManagement && !canManageAllDepts && teamMember?.departmentId) {
      result = result.filter(m => m.departmentId === teamMember.departmentId);
    }
    
    if (filterDept !== "all") {
      result = result.filter(m => m.departmentId === filterDept);
    }
    
    return result;
  })();

  const members = filteredMembers;

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/team-members", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Team member created successfully" });
      closeDialog();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error || error?.message || "Failed to create team member";
      toast({ title: "Failed to create team member", description: errorMsg, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/team-members/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Team member updated successfully" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update team member", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/team-members/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Team member deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete team member", variant: "destructive" });
    },
  });

  // Assign platforms to existing team member
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigningMember, setAssigningMember] = useState<TeamMember | null>(null);
  const [assignPlatforms, setAssignPlatforms] = useState<string[]>([]);
  const [assignPlatformUserIds, setAssignPlatformUserIds] = useState<Record<string, string>>({});

  const assignMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await apiRequest(`/api/team-members/${id}/assign-platforms`, "POST", payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Platforms assigned", description: "Platform access updated for the team member." });
      setIsAssignOpen(false);
      setAssigningMember(null);
      setAssignPlatforms([]);
      setAssignPlatformUserIds({});
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to assign platforms";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      departmentId: member.departmentId,
      roleId: member.roleId || "",
      employeeId: member.employeeId || "",
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      phone: member.phone || "",
      status: member.status,
      password: "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMember(null);
    setFormData({
      departmentId: "",
      roleId: "",
      employeeId: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "technician",
      phone: "",
      status: "active",
      password: "",
    });
  };

  const openAssignDialog = (member: TeamMember) => {
    setAssigningMember(member);
    const m = managedUsers?.find((mu: any) => mu.team_member_id === member.id || mu.email === member.email);
    if (m) {
      setAssignPlatforms(Array.isArray(m.platforms) ? m.platforms : []);
      setAssignPlatformUserIds(m.platformUserIds || {});
    } else {
      setAssignPlatforms([]);
      setAssignPlatformUserIds({});
    }
    setIsAssignOpen(true);
  };

  const getDeptName = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? `${dept.code} - ${dept.name}` : "Unknown";
  };

  if (isLoading) {
    return <div className="p-6">Loading team members...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">Manage employees across all departments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-member">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? "Edit Team Member" : "Add Team Member"}
                </DialogTitle>
                <DialogDescription>
                  {editingMember ? "Update team member information" : "Add a new team member"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    data-testid="input-last-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                    required
                  >
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.code} - {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g., HA-ADM-001"
                    data-testid="input-employee-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: DEPT-ROLE-NUMBER (e.g., HA-ADM-001)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-member">
                  {editingMember ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-64" data-testid="select-filter-dept">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.code} - {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add your first team member to get started
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Team Member
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id} data-testid={`row-member-${member.employeeId}`}>
                    <TableCell className="font-mono text-sm">{member.employeeId || "—"}</TableCell>
                    <TableCell className="font-medium">
                      {member.firstName} {member.lastName}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{getDeptName(member.departmentId)}</TableCell>
                    <TableCell>
                      <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === "active" ? "default" : "outline"}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(member)}
                            data-testid={`button-edit-member-${member.employeeId}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAssignDialog(member)}
                            data-testid={`button-assign-platforms-${member.employeeId}`}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete ${member.firstName} ${member.lastName}?`)) {
                                deleteMutation.mutate(member.id);
                              }
                            }}
                            data-testid={`button-delete-member-${member.employeeId}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Platforms</DialogTitle>
            <DialogDescription>
              Assign platform access for {assigningMember ? `${assigningMember.firstName} ${assigningMember.lastName}` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {(["metabase", "chatwoot", "typebot", "mailcow"]).map((p) => (
              <div key={p} className="flex items-center gap-3">
                <Checkbox
                  id={`assign-${p}`}
                  checked={assignPlatforms.includes(p)}
                  onCheckedChange={(val) => {
                    if (val) setAssignPlatforms((s) => Array.from(new Set([...s, p])));
                    else setAssignPlatforms((s) => s.filter((x) => x !== p));
                  }}
                />
                <Label htmlFor={`assign-${p}`} className="capitalize">{p}</Label>
                <Input
                  placeholder="Platform user id (optional)"
                  value={assignPlatformUserIds[p] || ""}
                  onChange={(e) => setAssignPlatformUserIds((s) => ({ ...s, [p]: e.target.value }))}
                  className="ml-auto w-44"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!assigningMember) return;
                assignMutation.mutate({ id: assigningMember.id, payload: { platforms: assignPlatforms, platformUserIds: assignPlatformUserIds } });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
