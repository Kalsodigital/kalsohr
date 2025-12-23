'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Building2, Users, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getOrganizations, deleteOrganization, getSubscriptionPlans } from '@/lib/api/organizations';
import { Organization, SubscriptionPlan } from '@/lib/types/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateOrganizationDialog } from './create-organization-dialog';
import { EditOrganizationDialog } from './edit-organization-dialog';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { PageLoader } from '@/components/ui/page-loader';
import { useAuthStore } from '@/lib/stores/auth-store';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

export default function OrganizationsPage() {
  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('organizations', true);

  const router = useRouter();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const { startImpersonation } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [deletingOrganization, setDeletingOrganization] = useState<Organization | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Wait for hydration before checking permissions
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check permission after hydration
  useEffect(() => {
    if (!isHydrated) return;

    if (!hasAnyPermission('organizations')) {
      router.push('/forbidden');
    }
  }, [isHydrated, hasAnyPermission, router]);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        // Only show refreshing indicator if we already have data
        if (!initialLoading) {
          setRefreshing(true);
        }
        const data = await getOrganizations({
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery,
          status: statusFilter,
        });
        setOrganizations(data.organizations);
        setPagination(data.pagination);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load organizations');
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    };

    const loadSubscriptionPlans = async () => {
      try {
        const plans = await getSubscriptionPlans();
        setSubscriptionPlans(plans);
      } catch (error) {
        console.error('Failed to load subscription plans:', error);
      }
    };

    loadOrganizations();
    loadSubscriptionPlans();
  }, [pagination.page, searchQuery, statusFilter, refreshTrigger]);

  // Don't render until permission check is complete
  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (initialLoading) {
    return (
      <DashboardLayout requireSuperAdmin>
        <PageLoader message="Loading organizations..." />
      </DashboardLayout>
    );
  }

  const handleDelete = async () => {
    if (!deletingOrganization) return;

    try {
      await deleteOrganization(deletingOrganization.id);
      toast.success('Organization deleted successfully');
      setDeletingOrganization(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
    }
  };

  const handleViewOrganization = async (org: Organization) => {
    // Start impersonation (will use super admin's platform role permissions)
    startImpersonation({
      id: org.id,
      name: org.name,
      slug: org.slug,
    });

    // Wait a bit for Zustand persist middleware to save to localStorage
    // This prevents a race condition where the redirect happens before
    // the impersonatedOrg is persisted, causing API calls to fail
    await new Promise(resolve => setTimeout(resolve, 100));

    // Redirect to organization dashboard
    router.push(`/${org.slug}/dashboard`);
    toast.success(`Viewing as ${org.name}`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      suspended: 'destructive',
      inactive: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <DashboardLayout requireSuperAdmin>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Organizations
              </h1>
              <p className="text-gray-600 mt-2">
                Manage all organizations in the system
              </p>
            </div>
            {refreshing && (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            )}
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={!hasPermission('organizations', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Organization
          </Button>
        </div>

        {/* Compact Stats + Search/Filters */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Total Organizations */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-lg font-semibold text-gray-900">{pagination.total}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            {/* Active */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Active:</span>
                <span className="text-lg font-semibold text-green-600">
                  {organizations.filter((org) => org.status === 'active').length}
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            {/* Suspended */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Suspended:</span>
                <span className="text-lg font-semibold text-red-600">
                  {organizations.filter((org) => org.status === 'suspended').length}
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            {/* Inactive */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Inactive:</span>
                <span className="text-lg font-semibold text-gray-400">
                  {organizations.filter((org) => org.status === 'inactive').length}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Search and Filters */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, slug, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 border-gray-200"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 border-gray-200">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            {organizations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Building2 className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No organizations found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Organization
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{org.name}</span>
                            <AuditHoverIcon
                            moduleCode="organizations"
                              createdAt={org.createdAt}
                              createdBy={org.createdBy}
                              creator={org.creator}
                              updatedAt={org.updatedAt}
                              updatedBy={org.updatedBy}
                              updater={org.updater}
                            />
                          </div>
                          <div className="text-sm text-gray-500">{org.slug}</div>
                          <div className="text-xs text-gray-400">{org.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {org.subscriptionPlan?.name}
                          </div>
                          {org.subscriptionExpiryDate && (
                            <div className="text-xs text-gray-500">
                              Expires:{' '}
                              {new Date(org.subscriptionExpiryDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{org._count?.users || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>{org._count?.employees || 0}</TableCell>
                      <TableCell>{getStatusBadge(org.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewOrganization(org)}
                            disabled={!hasPermission('organizations', 'canRead')}
                            className="disabled:opacity-50 disabled:cursor-not-allowed"
                            title="View Organization"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingOrganization(org)}
                            disabled={!hasPermission('organizations', 'canUpdate')}
                            className="disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingOrganization(org)}
                            disabled={!hasPermission('organizations', 'canDelete')}
                            className="disabled:opacity-50 disabled:cursor-not-allowed"
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
                  {pagination.total} organizations
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
      <CreateOrganizationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        subscriptionPlans={subscriptionPlans}
      />

      {/* Edit Dialog */}
      {editingOrganization && (
        <EditOrganizationDialog
          open={!!editingOrganization}
          onOpenChange={(open) => !open && setEditingOrganization(null)}
          organization={editingOrganization}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          subscriptionPlans={subscriptionPlans}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingOrganization}
        onOpenChange={(open) => !open && setDeletingOrganization(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingOrganization?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingOrganization(null)}>
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
