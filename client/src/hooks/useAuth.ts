import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User, RoleType, PermissionType } from "@shared/schema";
import { PERMISSION_TYPES, ROLE_TYPES } from "@shared/schema";

export interface AuthenticatedTeamMember {
  id: string;
  userId: string | null;
  departmentId: string;
  roleId: string | null;
  employeeId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  roleName?: string;
  roleCode?: RoleType;
  roleLevel?: number;
  departmentCode?: string;
  departmentName?: string;
  permissions?: string[];
}

export interface AuthUser extends User {
  teamMember?: AuthenticatedTeamMember | null;
  hasNewCredentials?: boolean;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const user = data;
  const teamMember = data?.teamMember;
  const { toast } = useToast();
  const _notifiedRef = useRef(false);

  useEffect(() => {
    if (data?.hasNewCredentials && !(_notifiedRef.current)) {
      toast({
        title: 'New Email Account',
        description: 'A corporate email account was just created for you. Check Email Credentials in your profile.',
      });
      _notifiedRef.current = true;
    }
  }, [data?.hasNewCredentials, toast]);

  const hasPermission = (permission: PermissionType): boolean => {
    if (!teamMember?.permissions) return false;
    return teamMember.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: PermissionType[]): boolean => {
    if (!teamMember?.permissions) return false;
    return permissions.some(p => teamMember.permissions?.includes(p));
  };

  const hasAllPermissions = (permissions: PermissionType[]): boolean => {
    if (!teamMember?.permissions) return false;
    return permissions.every(p => teamMember.permissions?.includes(p));
  };

  const isRole = (roleCode: RoleType): boolean => {
    return teamMember?.roleCode === roleCode;
  };

  const isRoleOrHigher = (roleCode: RoleType): boolean => {
    const roleLevels: Record<RoleType, number> = {
      [ROLE_TYPES.TECHNICIAN]: 1,
      [ROLE_TYPES.DEPARTMENT_ADMIN]: 2,
      [ROLE_TYPES.MANAGEMENT]: 3,
    };
    
    const requiredLevel = roleLevels[roleCode];
    return (teamMember?.roleLevel ?? 0) >= requiredLevel;
  };

  const isManagement = isRole(ROLE_TYPES.MANAGEMENT);
  const isDepartmentAdmin = isRole(ROLE_TYPES.DEPARTMENT_ADMIN);
  const isTechnician = isRole(ROLE_TYPES.TECHNICIAN);

  return {
    user,
    teamMember,
    isLoading,
    error,
    isAuthenticated: !!user,
    isTeamMember: !!teamMember,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    isRoleOrHigher,
    isManagement,
    isDepartmentAdmin,
    isTechnician,
    PERMISSION_TYPES,
    ROLE_TYPES,
  };
}
