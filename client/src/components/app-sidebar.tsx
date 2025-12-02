import { LayoutDashboard, Users, BarChart3, Activity, Settings, Database, MessageSquare, FormInput, Mail, Building2, UserCog, ClipboardList, Shield, UserPlus, ExternalLink } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface ManagedUser {
  id: string;
  platforms: string[];
  platformUserIds: Record<string, string>;
}

interface ServiceConfig {
  id: string;
  serviceName: string;
  apiUrl: string;
  enabled: boolean;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { teamMember, hasPermission, isManagement, isDepartmentAdmin, isTechnician, PERMISSION_TYPES } = useAuth();

  const { data: myManagedUser } = useQuery<ManagedUser | null>({
    queryKey: ["/api/team-members", teamMember?.id, "managed-user"],
    queryFn: async () => {
      if (!teamMember) return null;
      const res = await fetch(`/api/team-members/${teamMember.id}/managed-user`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!teamMember?.id,
  });

  const { data: services = [] } = useQuery<ServiceConfig[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const mainMenuItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      testId: "nav-dashboard",
      show: true,
    },
    {
      title: "Tasks",
      url: "/tasks",
      icon: ClipboardList,
      testId: "nav-tasks",
      show: hasPermission(PERMISSION_TYPES.VIEW_TASKS),
    },
    {
      title: "Departments",
      url: "/departments",
      icon: Building2,
      testId: "nav-departments",
      show: hasPermission(PERMISSION_TYPES.VIEW_ALL_DEPARTMENTS) || hasPermission(PERMISSION_TYPES.VIEW_OWN_DEPARTMENT),
    },
    {
      title: "Team Members",
      url: "/team",
      icon: UserCog,
      testId: "nav-team",
      show: hasPermission(PERMISSION_TYPES.MANAGE_DEPARTMENT_USERS) || hasPermission(PERMISSION_TYPES.MANAGE_GLOBAL_USERS),
    },
    {
      title: "User Management",
      url: "/users",
      icon: Users,
      testId: "nav-users",
      show: hasPermission(PERMISSION_TYPES.MANAGE_GLOBAL_USERS),
    },
    {
      title: "Staff Registrations",
      url: "/registrations",
      icon: UserPlus,
      testId: "nav-registrations",
      show: hasPermission(PERMISSION_TYPES.MANAGE_GLOBAL_USERS),
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
      testId: "nav-analytics",
      show: hasPermission(PERMISSION_TYPES.VIEW_ANALYTICS),
    },
    {
      title: "Activity Logs",
      url: "/activity",
      icon: Activity,
      testId: "nav-activity",
      show: hasPermission(PERMISSION_TYPES.VIEW_DEPARTMENT_LOGS) || hasPermission(PERMISSION_TYPES.VIEW_ALL_LOGS),
    },
    {
      title: "Configuration",
      url: "/config",
      icon: Settings,
      testId: "nav-config",
      show: hasPermission(PERMISSION_TYPES.MANAGE_SERVICE_CONFIG),
    },
  ];

  const visibleMenuItems = mainMenuItems.filter(item => item.show);

  const platformItems = [
    {
      title: "Metabase",
      icon: Database,
    },
    {
      title: "Chatwoot",
      icon: MessageSquare,
    },
    {
      title: "Typebot",
      icon: FormInput,
    },
    {
      title: "Mailcow",
      icon: Mail,
    },
  ];

  const getRoleBadge = () => {
    if (isManagement) return { label: "Management", variant: "default" as const };
    if (isDepartmentAdmin) return { label: "Dept Admin", variant: "secondary" as const };
    if (isTechnician) return { label: "Technician", variant: "outline" as const };
    return null;
  };

  const roleBadge = getRoleBadge();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-sidebar-foreground">Admin Hub</h2>
            <div className="flex items-center gap-2">
              {roleBadge && (
                <Badge variant={roleBadge.variant} className="text-xs">
                  {roleBadge.label}
                </Badge>
              )}
              {teamMember?.departmentCode && (
                <span className="text-xs text-muted-foreground">{teamMember.departmentCode}</span>
              )}
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} data-testid={item.testId}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {myManagedUser && Array.isArray(myManagedUser.platforms) && myManagedUser.platforms.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>My Platforms</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {myManagedUser.platforms.map((platformName) => {
                  const platformInfo = platformItems.find(p => p.title.toLowerCase() === platformName.toLowerCase());
                  const service = services.find(s => s.serviceName.toLowerCase() === platformName.toLowerCase());
                  const Icon = platformInfo?.icon || Database;
                  const displayName = platformInfo?.title || platformName;
                  
                  return (
                    <SidebarMenuItem key={platformName}>
                      <SidebarMenuButton
                        onClick={() => {
                          if (service?.apiUrl) {
                            window.open(service.apiUrl, '_blank');
                          }
                        }}
                        className="cursor-pointer hover:bg-accent"
                        data-testid={`platform-${platformName}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{displayName}</span>
                        {service?.apiUrl && <ExternalLink className="h-3 w-3 opacity-50" />}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="space-y-1">
          {teamMember && (
            <p className="text-xs text-muted-foreground truncate">
              {teamMember.firstName} {teamMember.lastName}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">@DevPulse.Inc</span>
          </p>
          <div className="text-[10px] opacity-70">
            &copy; {new Date().getFullYear()} MM ALL ELECTRONICS
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
