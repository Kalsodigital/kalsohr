'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getRolePermissions, updateRolePermissions, Role } from '@/lib/api/roles';
import {
  PLATFORM_MODULES,
  PERMISSION_ACTIONS,
  PermissionSet,
  DEFAULT_PERMISSIONS,
  FULL_ACCESS_PERMISSIONS,
} from '@/lib/constants/platform-modules';
import { Check, X, Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';

interface ManagePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  onSuccess: () => void;
}

interface Module {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

// Define module dependencies - when a module has any permission,
// these dependent modules should have canRead enabled
// This works both ways: if A depends on B, then:
// 1. When A has any permission, B gets canRead
// 2. When B has any permission, A can function (reads B's data)
const MODULE_DEPENDENCIES: Record<string, string[]> = {
  // Organizations needs master_data for countries, states, cities, org types, industry types, etc.
  organizations: ['master_data'],
  // Subscription plans may need master data too
  subscription_plans: ['master_data'],
  // Accounts management needs master data AND platform_roles (to assign roles to users)
  accounts: ['master_data', 'platform_roles'],
  // System modules may need master data
  system_modules: ['master_data'],
  // System settings may need master data
  system_settings: ['master_data'],
};

export function ManagePermissionsDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: ManagePermissionsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Map<string, PermissionSet>>(new Map());
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    if (open && role) {
      loadPermissions();
    }
  }, [open, role]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await getRolePermissions(role.id);

      // Convert permissions array to Map
      const permMap = new Map<string, PermissionSet>();

      // Use modules from API response
      if (data.modules && Array.isArray(data.modules)) {
        setModules(data.modules);

        // Initialize all modules with their existing permissions or default
        data.modules.forEach((module: any) => {
          if (module.permissions) {
            permMap.set(module.code, {
              canRead: module.permissions.canRead,
              canWrite: module.permissions.canWrite,
              canUpdate: module.permissions.canUpdate,
              canDelete: module.permissions.canDelete,
              canApprove: module.permissions.canApprove,
              canExport: module.permissions.canExport,
            });
          } else {
            permMap.set(module.code, { ...DEFAULT_PERMISSIONS });
          }
        });
      }

      setPermissions(permMap);
    } catch (error) {
      toast.error('Failed to load permissions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Apply dependencies - if a module has any permission, ensure dependent modules have canRead
  const applyDependencies = (permMap: Map<string, PermissionSet>): Map<string, PermissionSet> => {
    const newMap = new Map(permMap);

    // Check each module that has dependencies
    Object.entries(MODULE_DEPENDENCIES).forEach(([moduleCode, dependentModules]) => {
      const modulePerms = newMap.get(moduleCode);

      // Check if this module has any permission enabled
      const hasAnyPermission = modulePerms && (
        modulePerms.canRead || modulePerms.canWrite || modulePerms.canUpdate ||
        modulePerms.canDelete || modulePerms.canApprove || modulePerms.canExport
      );

      if (hasAnyPermission) {
        // Enable canRead on all dependent modules
        dependentModules.forEach(depModule => {
          const depPerms = newMap.get(depModule) || { ...DEFAULT_PERMISSIONS };
          if (!depPerms.canRead) {
            newMap.set(depModule, { ...depPerms, canRead: true });
          }
        });
      }
    });

    return newMap;
  };

  const updatePermission = (moduleCode: string, key: keyof PermissionSet, value: boolean) => {
    setPermissions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(moduleCode) || { ...DEFAULT_PERMISSIONS };
      newMap.set(moduleCode, { ...current, [key]: value });

      // Apply dependencies after the update
      return applyDependencies(newMap);
    });
  };

  const setModulePermissions = (moduleCode: string, permSet: PermissionSet) => {
    setPermissions(prev => {
      const newMap = new Map(prev);
      newMap.set(moduleCode, { ...permSet });

      // Apply dependencies after the update
      return applyDependencies(newMap);
    });
  };

  // Check if a module's canRead is required by another module's permissions
  const isRequiredDependency = (moduleCode: string): boolean => {
    // Find all modules that depend on this moduleCode
    for (const [parentModule, dependencies] of Object.entries(MODULE_DEPENDENCIES)) {
      if (dependencies.includes(moduleCode)) {
        const parentPerms = permissions.get(parentModule);
        // Check if the parent module has any permission enabled
        const parentHasPermission = parentPerms && (
          parentPerms.canRead || parentPerms.canWrite || parentPerms.canUpdate ||
          parentPerms.canDelete || parentPerms.canApprove || parentPerms.canExport
        );
        if (parentHasPermission) {
          return true;
        }
      }
    }
    return false;
  };

  const { user, refreshUserData } = useAuthStore();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Convert permissions Map to array format for API
      const permissionsArray = Array.from(permissions.entries()).map(([moduleCode, perms]) => ({
        moduleCode,
        ...perms,
      }));

      await updateRolePermissions(role.id, permissionsArray);
      toast.success('Permissions updated successfully');

      // If the current user's role was updated, refresh their permissions
      if (user?.role?.id === role.id) {
        try {
          await refreshUserData();
          toast.success('Your permissions have been refreshed. The page will reload.');
          // Reload the page to ensure all components pick up the new permissions
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Manage Permissions
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Configure module permissions for role: <strong>{role.name}</strong>
          </p>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Loading permissions...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Role Permissions</p>
                  <p>
                    Configure permissions for both platform modules (super admin panel) and organization modules (when impersonating organizations for support).
                  </p>
                  <p className="mt-2 text-xs">
                    <span className="text-green-600 font-medium">*</span> Some permissions are auto-selected based on dependencies.
                  </p>
                </div>
              </div>
            </div>

            {(() => {
              // Separate modules into platform and org modules based on type field
              const platformModules = modules.filter(m => (m as any).type === 'platform');
              const orgModules = modules.filter(m => (m as any).type === 'org');

              const renderModuleTable = (moduleList: Module[], title: string, description: string) => (
                moduleList.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{description}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/4">
                                Module
                              </th>
                              {PERMISSION_ACTIONS.map((action) => (
                                <th
                                  key={action.key}
                                  className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                                >
                                  <div className="flex flex-col items-center">
                                    <span>{action.label}</span>
                                  </div>
                                </th>
                              ))}
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Quick Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {moduleList.map((module) => {
                      const modulePerms = permissions.get(module.code) || DEFAULT_PERMISSIONS;
                      const hasAnyPermission = Object.values(modulePerms).some(v => v);

                      return (
                        <tr key={module.code} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{module.name}</div>
                              {module.description && (
                                <div className="text-xs text-gray-500 mt-1">{module.description}</div>
                              )}
                            </div>
                          </td>
                          {PERMISSION_ACTIONS.map((action) => {
                            // Check if this is a required dependency (canRead on dependent module)
                            const isLockedDependency = action.key === 'canRead' &&
                              isRequiredDependency(module.code) &&
                              modulePerms.canRead;

                            return (
                              <td key={action.key} className="px-4 py-4 text-center">
                                <div className="flex justify-center items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={modulePerms[action.key]}
                                    onChange={(e) =>
                                      updatePermission(module.code, action.key, e.target.checked)
                                    }
                                    disabled={isSubmitting || isLockedDependency}
                                    className={`h-5 w-5 rounded focus:ring-blue-500 border-gray-300 ${
                                      isLockedDependency
                                        ? 'text-green-600 cursor-not-allowed'
                                        : 'text-blue-600'
                                    }`}
                                    title={isLockedDependency ? 'Required by other module permissions' : ''}
                                  />
                                  {isLockedDependency && (
                                    <span className="text-xs text-green-600" title="Auto-selected (required dependency)">
                                      *
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-4">
                            <div className="flex justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setModulePermissions(module.code, FULL_ACCESS_PERMISSIONS)}
                                disabled={isSubmitting}
                                className="text-xs"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                All
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setModulePermissions(module.code, DEFAULT_PERMISSIONS)}
                                disabled={isSubmitting}
                                className="text-xs"
                              >
                                <X className="w-3 h-3 mr-1" />
                                None
                              </Button>
                            </div>
                          </td>
                        </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              );

              return (
                <>
                  {/* Platform Modules Section */}
                  {renderModuleTable(
                    platformModules,
                    'Platform Permissions',
                    'Control access to super admin panel modules like Organizations, Accounts, and System Settings.'
                  )}

                  {/* Organization Modules Section */}
                  {renderModuleTable(
                    orgModules,
                    'Organization Permissions (for Impersonation)',
                    'Control what this role can access when impersonating organizations for support purposes.'
                  )}
                </>
              );
            })()}

            {/* Legend */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Permission Definitions</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {PERMISSION_ACTIONS.map((action) => (
                  <div key={action.key}>
                    <span className="font-semibold text-gray-700">{action.label}:</span>
                    <span className="text-gray-600 ml-1">{action.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
