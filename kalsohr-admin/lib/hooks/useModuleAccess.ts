'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from './usePermissions';

/**
 * Hook to check if user has access to a specific module
 * Redirects to /forbidden if user doesn't have permission
 */
export function useModuleAccess(moduleCode: string, requireSuperAdmin = true) {
  const router = useRouter();
  const { hasAnyPermission, isSuperAdmin, isLoading } = usePermissions();

  useEffect(() => {
    if (isLoading) return; // Don't check until permissions are loaded

    // Check super admin requirement
    if (requireSuperAdmin && !isSuperAdmin) {
      router.replace('/forbidden');
      return;
    }

    // Check module permission
    if (!hasAnyPermission(moduleCode)) {
      router.replace('/forbidden');
      return;
    }
  }, [moduleCode, requireSuperAdmin, isSuperAdmin, hasAnyPermission, isLoading, router]);

  return {
    hasAccess: (requireSuperAdmin ? isSuperAdmin : true) && hasAnyPermission(moduleCode),
    isLoading,
  };
}
