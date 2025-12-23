'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Permission } from '@/lib/types/auth';

export type PermissionAction = 'canRead' | 'canWrite' | 'canUpdate' | 'canDelete' | 'canApprove' | 'canExport';

/**
 * Hook to check organization-scoped user permissions
 * For use in organization portal pages (not super admin)
 */
export function useOrgPermissions() {
  const { user, isLoading: authLoading, impersonatedOrg } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for client-side hydration to complete
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  /**
   * Check if user has a specific permission for a module
   * Organization users must have explicit permissions
   * Super admins impersonating have full access except delete/export (support mode restrictions)
   */
  const hasPermission = (moduleCode: string, action: PermissionAction): boolean => {
    // Block super admins who are NOT impersonating
    if (user?.isSuperAdmin && !impersonatedOrg) {
      return false;
    }

    // Super admin impersonating: grant all permissions except delete and export (safety restriction)
    if (user?.isSuperAdmin && impersonatedOrg) {
      if (action === 'canDelete' || action === 'canExport') {
        return false; // Safety: prevent accidental data loss/export in support mode
      }
      return true; // Grant all other permissions (read, write, update, approve)
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
   * Super admins impersonating organizations have full access (support mode)
   */
  const hasAnyPermission = (moduleCode: string): boolean => {
    // Block super admins who are NOT impersonating
    if (user?.isSuperAdmin && !impersonatedOrg) {
      return false;
    }

    // Super admins in support mode (impersonating) have full access to org modules
    if (user?.isSuperAdmin && impersonatedOrg) {
      return true;
    }

    // No user or no permissions
    if (!user?.permissions || user.permissions.length === 0) {
      return false;
    }

    // Find permission for the module (works for both regular users and impersonating super admins)
    const permission = user.permissions.find((p: Permission) => p.moduleCode === moduleCode);

    if (!permission) {
      return false;
    }

    // Check if user has at least one permission
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

  /**
   * Check if user belongs to the specified organization
   */
  const belongsToOrg = (orgSlug: string): boolean => {
    return user?.organization?.slug === orgSlug;
  };

  /**
   * Get the user's organization slug
   */
  const getOrgSlug = (): string | null => {
    return user?.organization?.slug || null;
  };

  return {
    hasPermission,
    hasAnyPermission,
    getModulePermissions,
    belongsToOrg,
    getOrgSlug,
    user,
    organization: user?.organization || null,
    role: user?.role || null,
    isLoading: authLoading || !isHydrated,
  };
}
