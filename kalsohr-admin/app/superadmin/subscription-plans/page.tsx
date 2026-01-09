'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Plus,
  Search,
  Edit,
  Trash2,
  CreditCard,
  Users,
  Building2,
  HardDrive,
  IndianRupee,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSubscriptionPlans, deleteSubscriptionPlan } from '@/lib/api/organizations';
import { SubscriptionPlan } from '@/lib/types/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateSubscriptionPlanDialog } from './create-subscription-plan-dialog';
import { EditSubscriptionPlanDialog } from './edit-subscription-plan-dialog';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

export default function SubscriptionPlansPage() {
  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('subscription_plans', true);

  const router = useRouter();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null);

  // Wait for hydration before checking permissions
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check permission after hydration
  useEffect(() => {
    if (!isHydrated) return;

    if (!hasAnyPermission('subscription_plans')) {
      router.push('/forbidden');
    }
  }, [isHydrated, hasAnyPermission, router]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        // Only show refreshing indicator if we already have data
        if (!initialLoading) {
          setRefreshing(true);
        }
        const data = await getSubscriptionPlans(includeInactive);
        setPlans(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load subscription plans');
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    };

    loadPlans();
  }, [includeInactive, refreshTrigger]);

  // Don't render until permission check is complete
  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (initialLoading) {
    return (
      <DashboardLayout requireSuperAdmin>
        <PageLoader message="Loading subscription plans..." />
      </DashboardLayout>
    );
  }

  const filteredPlans = plans.filter((plan) =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deletingPlan) return;

    try {
      await deleteSubscriptionPlan(deletingPlan.id);
      toast.success('Subscription plan deleted successfully');
      setDeletingPlan(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete subscription plan');
    }
  };

  const formatPrice = (price: number | null | undefined, currency: string = 'INR') => {
    if (price === null || price === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatLimit = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    if (value === -1) return 'Unlimited';
    return value.toLocaleString();
  };

  const formatStorage = (mb: number | null | undefined) => {
    if (mb === null || mb === undefined) return '-';
    if (mb === -1) return 'Unlimited';
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getAuditInfo = (plan: SubscriptionPlan) => {
    const creatorName = plan.creator
      ? `${plan.creator.firstName || ''} ${plan.creator.lastName || ''}`.trim() || plan.creator.email
      : 'System';
    const updaterName = plan.updater
      ? `${plan.updater.firstName || ''} ${plan.updater.lastName || ''}`.trim() || plan.updater.email
      : null;

    return { creatorName, updaterName };
  };

  return (
    <DashboardLayout requireSuperAdmin>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Subscription Plans
              </h1>
              <p className="text-gray-600 mt-2">
                Manage subscription plans and pricing tiers
              </p>
            </div>
            {refreshing && (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            )}
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={!hasPermission('subscription_plans', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Plan
          </Button>
        </div>

        {/* Compact Stats + Search/Filters */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Total Plans */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-lg font-semibold text-gray-900">{plans.length}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            {/* Active Plans */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Active:</span>
                <span className="text-lg font-semibold text-green-600">
                  {plans.filter((p) => p.isActive).length}
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            {/* Organizations */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Organizations:</span>
                <span className="text-lg font-semibold text-purple-600">
                  {plans.reduce((sum, p) => sum + (p._count?.organizations || 0), 0)}
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            {/* Inactive Plans */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Inactive:</span>
                <span className="text-lg font-semibold text-gray-400">
                  {plans.filter((p) => !p.isActive).length}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Search and Filters */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 border-gray-200"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Show inactive</span>
            </label>
          </div>
        </div>

        {/* Plans Grid */}
        {filteredPlans.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center">
                <CreditCard className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No subscription plans found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => {
              const { creatorName, updaterName } = getAuditInfo(plan);
              return (
                <Card
                  key={plan.id}
                  className={`border ${plan.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-75'}`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl font-bold text-gray-900">
                            {plan.name}
                          </CardTitle>
                          <AuditHoverIcon
                            moduleCode="subscription_plans"
                            createdAt={plan.createdAt}
                            createdBy={plan.createdBy}
                            creator={plan.creator}
                            updatedAt={plan.updatedAt}
                            updatedBy={plan.updatedBy}
                            updater={plan.updater}
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{plan.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={plan.isActive ? 'default' : 'secondary'}
                          className={plan.isActive ? 'bg-green-100 text-green-800' : ''}
                        >
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Pricing */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatPrice(plan.priceMonthly, plan.currency)}
                      </span>
                      <span className="text-sm text-gray-500">/month</span>
                    </div>
                    {plan.priceYearly && (
                      <p className="text-sm text-gray-500">
                        or {formatPrice(plan.priceYearly, plan.currency)}/year
                      </p>
                    )}

                    {/* Limits */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          Max Users
                        </span>
                        <span className="font-medium">{formatLimit(plan.maxUsers)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4" />
                          Max Employees
                        </span>
                        <span className="font-medium">{formatLimit(plan.maxEmployees)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-600">
                          <HardDrive className="w-4 h-4" />
                          Storage
                        </span>
                        <span className="font-medium">{formatStorage(plan.maxStorageMb)}</span>
                      </div>
                    </div>

                    {/* Organizations using this plan */}
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-700">
                          {plan._count?.organizations || 0}
                        </span>{' '}
                        organization{(plan._count?.organizations || 0) !== 1 ? 's' : ''} using this plan
                      </p>
                    </div>

                    {/* Audit Info */}
                    <div className="pt-4 border-t border-gray-100 space-y-1">
                      <p className="text-xs text-gray-400">
                        Created by {creatorName} on {formatDate(plan.createdAt)}
                      </p>
                      {updaterName && (
                        <p className="text-xs text-gray-400">
                          Last updated by {updaterName} on {formatDate(plan.updatedAt)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setEditingPlan(plan)}
                        disabled={!hasPermission('subscription_plans', 'canUpdate')}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setDeletingPlan(plan)}
                        disabled={!hasPermission('subscription_plans', 'canDelete') || (plan._count?.organizations || 0) > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateSubscriptionPlanDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Edit Dialog */}
      {editingPlan && (
        <EditSubscriptionPlanDialog
          open={!!editingPlan}
          onOpenChange={(open) => !open && setEditingPlan(null)}
          plan={editingPlan}
          onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingPlan}
        onOpenChange={(open) => !open && setDeletingPlan(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingPlan?.name}"? This will
              deactivate the plan. Organizations currently using this plan will
              not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPlan(null)}>
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
