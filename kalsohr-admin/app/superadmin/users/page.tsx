'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Users, UserCheck, UserX, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getUsers, deleteUser } from '@/lib/api/users';
import { getOrganizations } from '@/lib/api/organizations';
import { User } from '@/lib/types/user';
import { Organization } from '@/lib/types/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateUserDialog } from './create-user-dialog';
import { EditUserDialog } from './edit-user-dialog';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

export default function UsersPage() {
  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('accounts', true);

  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const { hasAnyPermission } = usePermissions();

  // Check if user has permission to view all users (accounts module)
  const canViewAllUsers = hasAnyPermission('accounts');

  // Filter users based on accounts permissions
  // If user has accounts permission, show all users; otherwise show only platform users
  const filteredUsers = useMemo(() => {
    if (canViewAllUsers) {
      return users;
    } else {
      // Show only platform users (super admins) if no accounts permission
      return users.filter(user => user.isSuperAdmin);
    }
  }, [users, canViewAllUsers]);

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchQuery, organizationFilter, statusFilter]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Only show refreshing indicator if we already have data
        if (!initialLoading) {
          setRefreshing(true);
        }
        const filters: any = {
          page: pagination.page,
          limit: pagination.limit,
        };

        if (searchQuery) filters.search = searchQuery;
        if (organizationFilter !== 'all') filters.organizationId = parseInt(organizationFilter);
        if (statusFilter !== 'all') filters.isActive = statusFilter === 'active';

        const data = await getUsers(filters);
        setUsers(data.users);
        setPagination(data.pagination);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load users');
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    };

    loadUsers();
  }, [pagination.page, searchQuery, organizationFilter, statusFilter, refreshTrigger]);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const data = await getOrganizations({ limit: 100 });
        setOrganizations(data.organizations);
      } catch (error) {
        console.error('Failed to load organizations:', error);
      }
    };

    loadOrganizations();
  }, []);

  // Don't render until permission check is complete
  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (initialLoading) {
    return (
      <DashboardLayout requireSuperAdmin>
        <PageLoader message="Loading users..." />
      </DashboardLayout>
    );
  }

  const handleDelete = async () => {
    if (!deletingUser) return;

    // Prevent deleting super admin users
    if (deletingUser.isSuperAdmin) {
      toast.error('Cannot delete super admin users');
      setDeletingUser(null);
      return;
    }

    try {
      await deleteUser(deletingUser.id);
      toast.success('User deleted successfully');
      setDeletingUser(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">
        Inactive
      </Badge>
    );
  };

  const activeUsers = filteredUsers.filter((user) => user.isActive);
  const inactiveUsers = filteredUsers.filter((user) => !user.isActive);

  // Count users by organization
  const usersByOrg: { [key: string]: number } = {};
  filteredUsers.forEach((user) => {
    if (user.organization) {
      usersByOrg[user.organization.name] = (usersByOrg[user.organization.name] || 0) + 1;
    }
  });

  return (
    <DashboardLayout requireSuperAdmin>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Users
              </h1>
              <p className="text-gray-600 mt-2">
                Manage all users across organizations
              </p>
            </div>
            {refreshing && (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            )}
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Compact Stats + Search/Filters */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-lg font-semibold text-gray-900">{filteredUsers.length}</span>
              </div>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Active:</span>
                <span className="text-lg font-semibold text-green-600">{activeUsers.length}</span>
              </div>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <UserX className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Inactive:</span>
                <span className="text-lg font-semibold text-red-600">{inactiveUsers.length}</span>
              </div>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Organizations:</span>
                <span className="text-lg font-semibold text-purple-600">{Object.keys(usersByOrg).length}</span>
              </div>
            </div>
          </div>

          {/* Right side - Search and Filters */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
              <SelectTrigger className="w-48 h-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No users found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First User
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {user.firstName} {user.lastName}
                            </span>
                            <AuditHoverIcon
                            moduleCode="accounts"
                              createdAt={user.createdAt}
                              createdBy={user.createdBy}
                              creator={user.creator}
                              updatedAt={user.updatedAt}
                              updatedBy={user.updatedBy}
                              updater={user.updater}
                            />
                            {user.isSuperAdmin && (
                              <Badge className="ml-2 bg-purple-100 text-purple-700 border-purple-200">
                                Super Admin
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-400">{user.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.organization ? (
                          <div>
                            <div className="font-medium">{user.organization.name}</div>
                            <div className="text-xs text-gray-500">{user.organization.slug}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Platform User</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role ? (
                          <div>
                            <div className="font-medium">{user.role.name}</div>
                            <div className="text-xs text-gray-500">{user.role.code}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No role</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(user.isActive)}
                          {user.emailVerified && (
                            <Badge variant="outline" className="text-xs w-fit">
                              Email Verified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? (
                          <div className="text-sm">
                            {new Date(user.lastLoginAt).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {new Date(user.lastLoginAt).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingUser(user)}
                            disabled={user.isSuperAdmin}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingUser(user)}
                            disabled={user.isSuperAdmin}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Card className="border border-gray-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 font-medium">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} users
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    disabled={pagination.page === 1}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    className="px-6"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    className="px-6"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        organizations={organizations}
      />

      {/* Edit Dialog */}
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          organizations={organizations}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingUser?.firstName} {deletingUser?.lastName}"?
              This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
