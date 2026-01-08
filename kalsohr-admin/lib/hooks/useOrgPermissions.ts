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
   * Check if a module is enabled for the user's organization
   */
  const isModuleEnabled = (moduleCode: string): boolean => {
    // Super admins don't have organization module restrictions when impersonating
    if (user?.isSuperAdmin && impersonatedOrg) {
      return true;
    }

    // Check if module is enabled in the organization
    if (!user?.organization?.organizationModules) {
      return true; // If no modules data, allow access (backward compatibility)
    }

    // Find the module in the organization's modules
    const orgModule = user.organization.organizationModules.find(
      (om) => om.orgModule.code === moduleCode
    );

    // If module not found in the list, check if any core module exists
    // If core modules exist in the list, it means non-core modules must be explicitly enabled
    const hasCoreModules = user.organization.organizationModules.some(om => om.orgModule.isCore);

    if (!orgModule) {
      // If we have core modules in the list, then this module should be explicitly listed
      // If not listed, it's not enabled
      return !hasCoreModules;
    }

    // Core modules are always enabled if they're in the list
    if (orgModule.orgModule.isCore) {
      return true;
    }

    // Non-core modules need to be explicitly enabled
    return orgModule.isEnabled;
  };

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

    // Check if module is enabled for the organization first
    if (!isModuleEnabled(moduleCode)) {
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

    // Check if module is enabled for the organization first
    if (!isModuleEnabled(moduleCode)) {
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
    isModuleEnabled,
    getModulePermissions,
    belongsToOrg,
    getOrgSlug,
    user,
    organization: user?.organization || null,
    role: user?.role || null,
    isLoading: authLoading || !isHydrated,
  };
}
