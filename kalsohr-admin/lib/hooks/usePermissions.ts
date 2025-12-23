import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Permission } from '@/lib/types/auth';

export type PermissionAction = 'canRead' | 'canWrite' | 'canUpdate' | 'canDelete' | 'canApprove' | 'canExport';

/**
 * Hook to check user permissions for specific modules
 */
export function usePermissions() {
  const { user, isLoading: authLoading, impersonatedOrg } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for client-side hydration to complete
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  /**
   * Check if user has a specific permission for a module
   * Super admins with roles follow their role permissions
   * Super admins without roles have all permissions
   * When impersonating, super admins get full access EXCEPT delete and export
   */
  const hasPermission = (moduleCode: string, action: PermissionAction): boolean => {
    // Super admin impersonating organization
    if (user?.isSuperAdmin && impersonatedOrg) {
      // Restrict delete and export actions during impersonation
      if (action === 'canDelete' || action === 'canExport') {
        return false;
      }
      // Allow all other actions (read, write, update, approve)
      return true;
    }

    // Super admins with a role should follow role permissions
    // Only super admins WITHOUT a role get full access (e.g., the original superadmin)
    if (user?.isSuperAdmin && !user?.role) {
      return true;
    }

    // No user or no permissions
    if (!user?.permissions || user.permissions.length === 0) {
      return false;
    }

    // Find permission for the module
    const permission = user.permissions.find((p: Permission) => p.moduleCode === moduleCode);

    if (!permission) {
      return false;
    }

    // Handle both boolean true and numeric 1 (from MySQL TINYINT)
    const value = permission[action] as boolean | number;
    return value === true || value === 1;
  };

  /**
   * Check if user has any permission (read, write, update, delete, approve, or export) for a module
   * When impersonating, grants access to all org modules
   * Super admins with roles follow their role permissions
   * Super admins without roles have access to all modules
   */
  const hasAnyPermission = (moduleCode: string): boolean => {
    // Super admin impersonating organization - has access to all org modules
    if (user?.isSuperAdmin && impersonatedOrg) {
      return true;
    }

    // Super admins with a role should follow role permissions
    // Only super admins WITHOUT a role get full access (e.g., the original superadmin)
    if (user?.isSuperAdmin && !user?.role) {
      return true;
    }

    // No user or no permissions
    if (!user?.permissions || user.permissions.length === 0) {
      return false;
    }

    // Find permission for the module
    const permission = user.permissions.find((p: Permission) => p.moduleCode === moduleCode);

    if (!permission) {
      return false;
    }

    // Check if user has at least one permission
    // Handle both boolean true and numeric 1 (from MySQL TINYINT)
    const isTruthy = (val: any) => val === true || val === 1;
    return isTruthy(permission.canRead) ||
           isTruthy(permission.canWrite) ||
           isTruthy(permission.canUpdate) ||
           isTruthy(permission.canDelete) ||
           isTruthy(permission.canApprove) ||
           isTruthy(permission.canExport);
  };

  /**
   * Get all permissions for a module
   */
  const getModulePermissions = (moduleCode: string): Permission | null => {
    if (!user?.permissions || user.permissions.length === 0) {
      return null;
    }

    return user.permissions.find((p: Permission) => p.moduleCode === moduleCode) || null;
  };

  return {
    hasPermission,
    hasAnyPermission,
    getModulePermissions,
    isSuperAdmin: user?.isSuperAdmin || false,
    isLoading: authLoading || !isHydrated,
  };
}
