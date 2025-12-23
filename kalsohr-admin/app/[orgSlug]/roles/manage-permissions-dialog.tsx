'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getOrgRolePermissions, updateOrgRolePermissions } from '@/lib/api/org/roles';
import { OrgRole, RolePermission } from '@/lib/types/org';
import { ORG_MODULES } from '@/lib/constants/org-modules';
import { Check, X, Shield } from 'lucide-react';

interface ManagePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  role: OrgRole;
  onSuccess: () => void;
}

interface PermissionSet {
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

const DEFAULT_PERMISSIONS: PermissionSet = {
  canRead: false,
  canWrite: false,
  canUpdate: false,
  canDelete: false,
  canApprove: false,
  canExport: false,
};

// Module dependency rules - when a module has any permission,
// its dependent modules automatically get canRead enabled
const MODULE_DEPENDENCIES: Record<string, string[]> = {
  // Users module needs roles to assign roles to users
  users: ['roles'],
  // All data modules need master_data
  employees: ['master_data'],
  attendance: ['master_data', 'employees'],
  leave: ['master_data', 'employees'],
  recruitment: ['master_data'],
  payroll: ['master_data', 'employees'], // Payroll needs employee records
  performance: ['master_data', 'employees'],
  assets: ['master_data', 'employees'], // Assets are assigned to employees
  reports: ['master_data'],
};

const FULL_ACCESS_PERMISSIONS: PermissionSet = {
  canRead: true,
  canWrite: true,
  canUpdate: true,
  canDelete: true,
  canApprove: true,
  canExport: true,
};

const PERMISSION_ACTIONS = [
  { key: 'canRead' as keyof PermissionSet, label: 'Read', description: 'View records' },
  { key: 'canWrite' as keyof PermissionSet, label: 'Create', description: 'Create new records' },
  { key: 'canUpdate' as keyof PermissionSet, label: 'Update', description: 'Edit existing records' },
  { key: 'canDelete' as keyof PermissionSet, label: 'Delete', description: 'Remove records' },
  { key: 'canApprove' as keyof PermissionSet, label: 'Approve', description: 'Approve workflows' },
  { key: 'canExport' as keyof PermissionSet, label: 'Export', description: 'Export data' },
];

export function ManagePermissionsDialog({
  open,
  onOpenChange,
  orgSlug,
  role,
  onSuccess,
}: ManagePermissionsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Map<string, PermissionSet>>(new Map());

  useEffect(() => {
    if (open && role) {
      loadPermissions();
    }
  }, [open, role]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await getOrgRolePermissions(orgSlug, role.id);

      // Convert permissions array to Map
      const permMap = new Map<string, PermissionSet>();

      // Initialize all org modules with default permissions
      ORG_MODULES.forEach((module) => {
        const existingPerm = data.find((p: RolePermission) => p.moduleCode === module.code);
        if (existingPerm) {
          permMap.set(module.code, {
            canRead: existingPerm.canRead,
            canWrite: existingPerm.canWrite,
            canUpdate: existingPerm.canUpdate,
            canDelete: existingPerm.canDelete,
            canApprove: existingPerm.canApprove,
            canExport: existingPerm.canExport,
          });
        } else {
          permMap.set(module.code, { ...DEFAULT_PERMISSIONS });
        }
      });

      setPermissions(permMap);
    } catch (error) {
      toast.error('Failed to load permissions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply permission dependencies
   * When a module has any permission, automatically enable canRead on its dependent modules
   */
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

  /**
   * Check if a module's canRead permission is required due to dependencies
   * Used to disable the checkbox and show visual indicators
   */
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

  const updatePermission = (moduleCode: string, key: keyof PermissionSet, value: boolean) => {
    setPermissions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(moduleCode) || { ...DEFAULT_PERMISSIONS };
      newMap.set(moduleCode, { ...current, [key]: value });

      // Apply dependencies after updating permission
      return applyDependencies(newMap);
    });
  };

  const setModulePermissions = (moduleCode: string, permSet: PermissionSet) => {
    setPermissions(prev => {
      const newMap = new Map(prev);
      newMap.set(moduleCode, { ...permSet });

      // Apply dependencies after setting module permissions
      return applyDependencies(newMap);
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Convert permissions Map to array format for API
      const permissionsArray = Array.from(permissions.entries()).map(([moduleCode, perms]) => ({
        moduleCode,
        ...perms,
      }));

      await updateOrgRolePermissions(orgSlug, role.id, { permissions: permissionsArray });
      toast.success('Permissions updated successfully');
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
                  <p className="font-semibold mb-1">Organization Permissions</p>
                  <p>
                    These permissions control what users with this role can do within your organization.
                    Configure access to modules like employees, attendance, leave management, and more.
                  </p>
                  <p className="mt-2 text-xs">
                    <span className="font-semibold">Note:</span> Some permissions are automatically enabled based on dependencies.
                    For example, managing employees requires read access to master data (departments, designations, etc.).
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions Table */}
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
                    {ORG_MODULES.map((module) => {
                      const modulePerms = permissions.get(module.code) || DEFAULT_PERMISSIONS;

                      return (
                        <tr key={module.code} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{module.name}</div>
                              {module.description && (
                                <div className="text-xs text-gray-500 mt-1">{module.description}</div>
                              )}
                              {module.isCore && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                  Core Module
                                </span>
                              )}
                            </div>
                          </td>
                          {PERMISSION_ACTIONS.map((action) => {
                            const isReadAction = action.key === 'canRead';
                            const isLockedDependency = isReadAction && isRequiredDependency(module.code);

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
                                    className={`h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 ${
                                      isLockedDependency ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  />
                                  {isLockedDependency && (
                                    <span
                                      className="text-green-600 text-xs font-bold"
                                      title="Auto-selected (required dependency)"
                                    >
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

              {/* Add dependency legend */}
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-sm font-bold">*</span>
                  <span className="text-gray-700 font-semibold">Auto-selected:</span>
                  <span className="text-gray-600">
                    Permission automatically enabled due to dependencies
                  </span>
                </div>
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
