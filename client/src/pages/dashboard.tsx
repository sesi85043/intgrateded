import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { 
  Users, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  MessageSquare, 
  FormInput, 
  Mail,
  ClipboardList,
  Clock,
  Building2,
  UserCheck,
  BarChart3,
  ArrowRight,
  ChevronDown,
  UserPlus,
  Phone,
  Bot,
  Server,
  Zap
} from "lucide-react";
import PlatformBadge from "@/components/platform-badge";
import { apiRequest } from "@/lib/queryClient";
import type { ServiceConfig, ActivityLog, Task, TeamMember, Department } from "@shared/schema";

function TechnicianDashboard() {
  const { teamMember } = useAuth();
  const [platformsOpen, setPlatformsOpen] = useState(true);

  const { data: myManagedUser } = useQuery<any | null>({
    queryKey: ["/api/team-members", teamMember?.id, "managed-user"],
    queryFn: async () => {
      if (!teamMember) return null;
      return await fetch(`/api/team-members/${teamMember.id}/managed-user`).then((r) => r.json());
    },
    enabled: !!teamMember?.id,
  });

  const { data: services = [] } = useQuery<any[]>({
    queryKey: ["/api/services"],
  });

  const platformIcons: any = {
    metabase: Database,
    chatwoot: MessageSquare,
    typebot: FormInput,
    mailcow: Mail,
  };

  const { data: myTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const assignedToMe = myTasks.filter(t => t.assignedToId === teamMember?.id);
  const pendingTasks = assignedToMe.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = assignedToMe.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Welcome, {teamMember?.firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          {teamMember?.departmentName} Department - Technician Dashboard
        </p>
      </div>

      <Card>
        <CardHeader 
          className="cursor-pointer flex flex-row items-center justify-between"
          onClick={() => setPlatformsOpen(!platformsOpen)}
        >
          <div>
            <CardTitle>My Platforms</CardTitle>
            <CardDescription>Quick access to the platforms assigned to you</CardDescription>
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${platformsOpen ? "rotate-180" : ""}`} />
        </CardHeader>
        
        {platformsOpen && (
          <CardContent className="pt-0">
            {myManagedUser && Array.isArray(myManagedUser.platforms) && myManagedUser.platforms.length > 0 ? (
              <div className="space-y-3">
                {myManagedUser.platforms.map((p: string) => {
                  const svc = services.find((s: any) => s.serviceName === p);
                  const platformUserId = myManagedUser.platformUserIds ? myManagedUser.platformUserIds[p] : undefined;
                  const accent = p === "metabase" ? "bg-purple-600" : p === "chatwoot" ? "bg-green-600" : p === "typebot" ? "bg-indigo-600" : "bg-amber-500";
                  return (
                    <div key={p} className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className={`${accent} w-1 h-12 rounded`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <PlatformBadge platform={p} />
                            {platformUserId && <span className="text-xs text-muted-foreground">ID: {platformUserId}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{svc ? svc.apiUrl : "Not configured"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {svc && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                window.location.href = svc.apiUrl;
                              }}
                            >
                              Open
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!svc) return;
                                const ssoUrl = platformUserId ? `${svc.apiUrl}?user_id=${encodeURIComponent(platformUserId)}` : svc.apiUrl;
                                window.location.href = ssoUrl;
                              }}
                            >
                              SSO
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>You don't have access to any platforms yet.</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex group rounded-md overflow-hidden">
          <div className="bg-blue-600 w-1" />
          <Card className="flex-1 transition-shadow group-hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-assigned-tasks">
              {assignedToMe.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total assigned to you
            </p>
          </CardContent>
          </Card>
        </div>

        <div className="flex group rounded-md overflow-hidden">
          <div className="bg-amber-500 w-1" />
          <Card className="flex-1 transition-shadow group-hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-tasks">
              {pendingTasks.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending completion
            </p>
          </CardContent>
          </Card>
        </div>

        <div className="flex group rounded-md overflow-hidden">
          <div className="bg-green-600 w-1" />
          <Card className="flex-1 transition-shadow group-hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-tasks">
              {completedTasks.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks finished
            </p>
          </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>Tasks assigned to you</CardDescription>
          </div>
          <Link href="/tasks">
            <Button variant="outline" size="sm">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingTasks.length > 0 ? (
            <div className="space-y-3">
              {pendingTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-md border border-border"
                  data-testid={`task-${task.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Priority: {task.priority} | Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                  <Badge variant={task.status === 'in_progress' ? 'default' : 'secondary'}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending tasks</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DepartmentAdminDashboard() {
  const { teamMember } = useAuth();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const deptTasks = tasks.filter(t => t.departmentId === teamMember?.departmentId);
  const deptMembers = teamMembers.filter(m => m.departmentId === teamMember?.departmentId);
  const activeTechnicians = deptMembers.filter(m => m.role === 'technician' && m.status === 'active');
  const pendingTasks = deptTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          {teamMember?.departmentName} Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Department overview and management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-team-members">
              {deptMembers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In your department
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Technicians</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-technicians">
              {activeTechnicians.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available for tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Department Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-dept-tasks">
              {deptTasks.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-dept-tasks">
              {pendingTasks.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Your department team</CardDescription>
            </div>
            <Link href="/team">
              <Button variant="outline" size="sm">
                Manage <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deptMembers.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-md border border-border"
                  data-testid={`member-${member.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                  </div>
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </div>
              ))}
              {deptMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No team members</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Department task activity</CardDescription>
            </div>
            <Link href="/tasks">
              <Button variant="outline" size="sm">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : deptTasks.length > 0 ? (
              <div className="space-y-3">
                {deptTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border"
                    data-testid={`task-${task.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Priority: {task.priority}
                      </p>
                    </div>
                    <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tasks yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ManagementDashboard() {
  const { isManagement, isDepartmentAdmin } = useAuth();
  const { data: services, isLoading: servicesLoading } = useQuery<ServiceConfig[]>({
    queryKey: ["/api/services"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity/recent"],
  });

  const { data: stats } = useQuery<{
    totalUsers: number;
    activeUsers: number;
    totalActivities: number;
    servicesEnabled: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const platformIcons = {
    metabase: Database,
    chatwoot: MessageSquare,
    typebot: FormInput,
    mailcow: Mail,
  };

  const { data: registrationStats } = useQuery<{
    pending: number;
    approved: number;
    rejected: number;
  }>({
    queryKey: ["/api/registrations/stats"],
    queryFn: async () => {
      const res = await apiRequest("/api/registrations/stats", "GET");
      return res.json();
    },
    enabled: isManagement || isDepartmentAdmin,
  });

  const { data: emailStats } = useQuery<{
    total: number;
    active: number;
    inactive: number;
  }>({
    queryKey: ["/api/hr/email-credentials/stats"],
    queryFn: async () => {
      const res = await apiRequest("/api/hr/email-credentials/stats", "GET");
      return res.json();
    },
    enabled: isManagement,
  });

  const { data: integrationStatus, isLoading: statusLoading } = useQuery<{
    chatwoot: { configured: boolean; enabled: boolean; lastSync?: string };
    evolution: { configured: boolean; enabled: boolean; connectionStatus?: string };
    typebot: { configured: boolean; enabled: boolean };
    mailcow: { configured: boolean; enabled: boolean; lastSync?: string };
    cpanel: { configured: boolean; enabled: boolean };
  }>({
    queryKey: ["/api/integrations/status"],
  });

  const activeDepts = departments.filter(d => d.status === 'active');

  const getServiceIcon = (service: string) => {
    const icons: any = {
      chatwoot: MessageSquare,
      evolution: Phone,
      typebot: Bot,
      mailcow: Mail,
      cpanel: Server,
      metabase: Database,
    };
    return icons[service] || RefreshCw;
  };

  const getServiceColor = (service: string) => {
    const colors: any = {
      chatwoot: "bg-blue-100 text-blue-700 border-blue-200",
      evolution: "bg-green-100 text-green-700 border-green-200",
      typebot: "bg-amber-100 text-amber-700 border-amber-200",
      mailcow: "bg-purple-100 text-purple-700 border-purple-200",
      cpanel: "bg-red-100 text-red-700 border-red-200",
      metabase: "bg-indigo-100 text-indigo-700 border-indigo-200",
    };
    return colors[service] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Global Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Management overview across all departments
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all platforms
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registrationStats?.pending ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              New staff registrations
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Accounts</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {emailStats?.active ?? 0} active accounts
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Departments</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDepts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Functional units
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Administrative shortcuts</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/users">
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary">
                    <UserPlus className="h-6 w-6" />
                    <span>Create User</span>
                  </Button>
                </Link>
                <Link href="/registrations">
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200">
                    <Clock className="h-6 w-6" />
                    <span>Approvals</span>
                  </Button>
                </Link>
                <Link href="/integrations">
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                    <RefreshCw className="h-6 w-6" />
                    <span>Integrations</span>
                  </Button>
                </Link>
                <Link href="/hr-management">
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200">
                    <Mail className="h-6 w-6" />
                    <span>Credentials</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Organization structure</CardDescription>
              </div>
              <Link href="/departments">
                <Button variant="outline" size="sm">
                  Manage <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments.map((dept) => {
                  const deptMembers = teamMembers.filter(m => m.departmentId === dept.id);
                  const deptTasks = tasks.filter(t => t.departmentId === dept.id);
                  return (
                    <div
                      key={dept.id}
                      className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                      data-testid={`dept-${dept.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{dept.name}</p>
                        <Badge variant="outline" className="text-[10px] h-5">{dept.code}</Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {deptMembers.length} members</span>
                        <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> {deptTasks.length} tasks</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {departments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No departments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Integration Status
              </CardTitle>
              <CardDescription>Real-time service health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <>
                  {Object.entries({
                    chatwoot: { name: 'Chatwoot', desc: 'Support & Chat' },
                    evolution: { name: 'Evolution', desc: 'WhatsApp API' },
                    typebot: { name: 'Typebot', desc: 'Chat Flows' },
                    mailcow: { name: 'Mailcow', desc: 'Email Server' },
                    cpanel: { name: 'cPanel', desc: 'Provisioning' },
                    metabase: { name: 'Metabase', desc: 'Analytics' },
                  }).map(([key, { name, desc }]) => {
                    const svc = services?.find(s => s.serviceName === key);
                    const integStatus = integrationStatus?.[key as keyof typeof integrationStatus];
                    const Icon = getServiceIcon(key);
                    const isConfigured = integStatus?.configured ?? svc?.enabled ?? false;
                    const isEnabled = integStatus?.enabled ?? svc?.enabled ?? false;
                    
                    return (
                      <div 
                        key={key} 
                        className={`flex items-center justify-between p-2.5 rounded-md border ${getServiceColor(key)} transition-colors`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-none">{name}</p>
                            <p className="text-[10px] opacity-70 truncate">{desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isEnabled ? (
                            <Badge className="bg-green-600 text-white text-[10px] h-5 px-1.5">Active</Badge>
                          ) : isConfigured ? (
                            <Badge className="bg-yellow-600 text-white text-[10px] h-5 px-1.5">Disabled</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5">Pending</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-3 pt-3 border-t">
                    <Link href="/integrations">
                      <Button variant="ghost" size="sm" className="w-full text-xs">
                        Configure <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>System events</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <p className="text-muted-foreground leading-snug">
                          <span className="font-medium text-foreground capitalize">{log.action.replace(/_/g, ' ')}</span>
                          {log.platform && ` on ${log.platform}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-xs text-muted-foreground">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function GlobalDashboard() {
  return <ManagementDashboard />;
}

export default function Dashboard() {
  const { isManagement, isDepartmentAdmin } = useAuth();

  if (isManagement) {
    return <GlobalDashboard />;
  }

  if (isDepartmentAdmin) {
    return <DepartmentAdminDashboard />;
  }

  return <TechnicianDashboard />;
}
