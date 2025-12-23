'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import { Plus, Search, Edit, Trash2, Users, UserCheck, UserX, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { getOrgUsers, deleteOrgUser } from '@/lib/api/org/users';
import { getOrgRoles } from '@/lib/api/org/roles';
import { OrgUser, OrgRole } from '@/lib/types/org';
import { SubscriptionInfo } from '@/lib/types/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateUserDialog } from './create-user-dialog';
import { EditUserDialog } from './edit-user-dialog';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function OrgUsersPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const { hasPermission, isLoading: permissionLoading } = useOrgPermissions();

  // Permission checks
  const canRead = hasPermission('users', 'canRead');
  const canWrite = hasPermission('users', 'canWrite');
  const canUpdate = hasPermission('users', 'canUpdate');
  const canDelete = hasPermission('users', 'canDelete');

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<OrgUser | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadUsers = async () => {
      if (!canRead) return;

      try {
        setLoading(true);
        const filters: any = {
          page: pagination.page,
          limit: pagination.limit,
        };

        if (searchQuery) filters.search = searchQuery;
        if (roleFilter !== 'all') filters.roleId = parseInt(roleFilter);
        if (statusFilter !== 'all') filters.isActive = statusFilter === 'active';

        const data = await getOrgUsers(orgSlug, filters);
        setUsers(data.users);
        setPagination(data.pagination);
        if (data.subscriptionInfo) {
          setSubscriptionInfo(data.subscriptionInfo);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    if (!permissionLoading && canRead) {
      loadUsers();
    }
  }, [pagination.page, searchQuery, roleFilter, statusFilter, refreshTrigger, orgSlug, permissionLoading, canRead]);

  useEffect(() => {
    const loadRoles = async () => {
      if (!canRead) return;

      try {
        const data = await getOrgRoles(orgSlug);
        setRoles(data);
      } catch (error) {
        console.error('Failed to load roles:', error);
      }
    };

    if (!permissionLoading && canRead) {
      loadRoles();
    }
  }, [orgSlug, permissionLoading, canRead]);

  // Don't render until permission check is complete
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">You don't have permission to view users.</p>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      await deleteOrgUser(orgSlug, deletingUser.id);
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

  const activeUsers = users.filter((user) => user.isActive);
  const inactiveUsers = users.filter((user) => !user.isActive);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Users
          </h1>
          <p className="text-gray-600 mt-2">
            Manage users in your organization
          </p>
        </div>
        {canWrite && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    disabled={subscriptionInfo && !subscriptionInfo.canAddMore}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </span>
              </TooltipTrigger>
              {subscriptionInfo && !subscriptionInfo.canAddMore && (
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    User limit reached ({subscriptionInfo.currentActiveUsers}/{subscriptionInfo.maxUsers}).
                    <br />
                    Your <strong>{subscriptionInfo.planName}</strong> plan allows a maximum of {subscriptionInfo.maxUsers} active users.
                    <br />
                    Please upgrade your plan to add more users.
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-6">
        {/* Stats + Search/Filters */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-lg font-semibold text-gray-900">{pagination.total}</span>
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
              <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <UserX className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Inactive:</span>
                <span className="text-lg font-semibold text-yellow-600">{inactiveUsers.length}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Admins:</span>
                <span className="text-lg font-semibold text-red-600">
                  {users.filter(u => u.role?.code === 'org_admin').length}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Search and Filters */}
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 border-gray-200"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40 h-9 border-gray-200">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 border-gray-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-500">Loading...</div>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No users found</p>
                {canWrite && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First User
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="pl-6">
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-400">{user.phone}</div>
                          )}
                        </div>
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
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingUser(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingUser(user)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
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
        orgSlug={orgSlug}
        roles={roles}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />

      {/* Edit Dialog */}
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          orgSlug={orgSlug}
          user={editingUser}
          roles={roles}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
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
    </div>
  );
}
