import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
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
  ArrowRight
} from "lucide-react";
import type { ServiceConfig, ActivityLog, Task, TeamMember, Department } from "@shared/schema";

function TechnicianDashboard() {
  const { teamMember } = useAuth();

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
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

        <Card>
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

        <Card>
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

  const activeDepts = departments.filter(d => d.status === 'active');
  const totalTechnicians = teamMembers.filter(m => m.role === 'technician').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Global Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Management overview across all departments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-departments">
              {activeDepts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-team">
              {teamMembers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalTechnicians} technicians
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tasks">
              {tasks.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingTasks.length} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Online</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-services-online">
              {stats?.servicesEnabled ?? 0}/4
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected platforms
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <div className="space-y-3">
              {departments.map((dept) => {
                const deptMembers = teamMembers.filter(m => m.departmentId === dept.id);
                const deptTasks = tasks.filter(t => t.departmentId === dept.id);
                return (
                  <div
                    key={dept.id}
                    className="p-3 rounded-md border border-border"
                    data-testid={`dept-${dept.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{dept.name}</p>
                      <Badge variant="outline">{dept.code}</Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{deptMembers.length} members</span>
                      <span>{deptTasks.length} tasks</span>
                    </div>
                  </div>
                );
              })}
              {departments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No departments</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            {servicesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {services?.map((service) => {
                  const Icon = platformIcons[service.serviceName as keyof typeof platformIcons] || Database;
                  return (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 rounded-md border border-border"
                      data-testid={`service-status-${service.serviceName}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{service.serviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {service.lastSyncAt
                              ? `Synced ${new Date(service.lastSyncAt).toLocaleString()}`
                              : "Never synced"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={service.enabled ? "default" : "secondary"}>
                        {service.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  );
                })}
                {(!services || services.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No services configured</p>
                    <Link href="/config">
                      <Button variant="ghost" className="mt-2">
                        Configure Services
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>System-wide activity</CardDescription>
            </div>
            <Link href="/activity">
              <Button variant="outline" size="sm">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity?.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-md border border-border"
                    data-testid={`activity-${activity.id}`}
                  >
                    <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.platform && <span className="capitalize">{activity.platform}</span>}
                        {activity.platform && " | "}
                        {activity.createdAt && new Date(activity.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(!recentActivity || recentActivity.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isManagement, isDepartmentAdmin, isTechnician, isLoading, teamMember } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!teamMember) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            Your account is not linked to a team member profile.
          </p>
        </div>
      </div>
    );
  }

  if (isManagement) {
    return <ManagementDashboard />;
  }

  if (isDepartmentAdmin) {
    return <DepartmentAdminDashboard />;
  }

  if (isTechnician) {
    return <TechnicianDashboard />;
  }

  return <TechnicianDashboard />;
}
