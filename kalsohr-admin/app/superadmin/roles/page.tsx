'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getPlatformRoles, deleteRole, Role } from '@/lib/api/roles';
import { CreateRoleDialog } from './create-role-dialog';
import { EditRoleDialog } from './edit-role-dialog';
import { ManagePermissionsDialog } from './manage-permissions-dialog';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

export default function RolesPage() {
  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('platform_roles', true);

  // Get granular permissions for platform_roles module
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canRead = hasPermission('platform_roles', 'canRead');
  const canWrite = hasPermission('platform_roles', 'canWrite');
  const canUpdate = hasPermission('platform_roles', 'canUpdate');
  const canDelete = hasPermission('platform_roles', 'canDelete');

  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await getPlatformRoles();
      setRoles(data);
      setFilteredRoles(data);
    } catch (error) {
      toast.error('Failed to load roles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess && !permissionLoading && !permissionsLoading && canRead) {
      fetchRoles();
    }
  }, [hasAccess, permissionLoading, permissionsLoading, canRead]);

  useEffect(() => {
    const filtered = roles.filter(role =>
      role.name.toLowerCase().includes(search.toLowerCase()) ||
      role.code?.toLowerCase().includes(search.toLowerCase()) ||
      role.description?.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredRoles(filtered);
  }, [search, roles]);

  // Don't render until permission check is complete
  if (permissionLoading || permissionsLoading) {
    return (
      <DashboardLayout requireSuperAdmin={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">Loading permissions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Check if user has module access
  if (!hasAccess) {
    return null;
  }

  // Check if user has read permission
  if (!canRead) {
    return (
      <DashboardLayout requireSuperAdmin={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view platform roles.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleDelete = async (role: Role) => {
    if (role.isSystem) {
      toast.error('Cannot delete system roles');
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    try {
      await deleteRole(role.id);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete role');
    }
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setEditDialogOpen(true);
  };

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setPermissionsDialogOpen(true);
  };

  return (
    <DashboardLayout requireSuperAdmin={true}>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Platform Roles</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage platform-level roles and permissions for super admin users
              </p>
            </div>
            {canWrite && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search roles by name, code, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Roles List */}
      <div className="px-8 pb-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Loading roles...</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {search ? 'No roles found matching your search' : 'No platform roles yet'}
            </p>
            {!search && canWrite && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Role
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                      <AuditHoverIcon
                      moduleCode="platform_roles"
                        createdAt={role.createdAt}
                        createdBy={role.createdBy}
                        creator={role.creator}
                        updatedAt={role.updatedAt || role.createdAt}
                        updatedBy={role.updatedBy}
                        updater={role.updater}
                      />
                      {role.isSystem && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          System
                        </span>
                      )}
                      {!role.isActive && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {role.code && (
                      <p className="text-sm text-gray-500 mb-2">
                        Code: <span className="font-mono">{role.code}</span>
                      </p>
                    )}
                    {role.description && (
                      <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {role._count && (
                        <>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{role._count.users} users</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="w-4 h-4" />
                            <span>{role._count.rolePermissions} permissions</span>
                          </div>
                        </>
                      )}
                      <span className="ml-auto">
                        Created {new Date(role.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {canUpdate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManagePermissions(role)}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Permissions
                      </Button>
                    )}
                    {canUpdate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(role)}
                        disabled={role.isSystem}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(role)}
                        disabled={role.isSystem}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateRoleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchRoles}
      />

      {selectedRole && (
        <>
          <EditRoleDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            role={selectedRole}
            onSuccess={fetchRoles}
          />
          <ManagePermissionsDialog
            open={permissionsDialogOpen}
            onOpenChange={setPermissionsDialogOpen}
            role={selectedRole}
            onSuccess={fetchRoles}
          />
        </>
      )}
    </div>
    </DashboardLayout>
  );
}
