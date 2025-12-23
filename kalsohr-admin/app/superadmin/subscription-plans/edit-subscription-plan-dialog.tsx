'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  updateSubscriptionPlan,
  getPlanModules,
  updatePlanModules,
} from '@/lib/api/organizations';
import { SubscriptionPlan, OrgModule } from '@/lib/types/organization';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  priceMonthly: z.string().optional(),
  priceYearly: z.string().optional(),
  currency: z.string().optional(),
  maxUsers: z.string().optional(),
  maxEmployees: z.string().optional(),
  maxStorageMb: z.string().optional(),
  displayOrder: z.string().optional(),
  isActive: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface EditSubscriptionPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan;
  onSuccess: () => void;
}

export function EditSubscriptionPlanDialog({
  open,
  onOpenChange,
  plan,
  onSuccess,
}: EditSubscriptionPlanDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modules, setModules] = useState<(OrgModule & { isAssigned: boolean })[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const currency = watch('currency');
  const isActive = watch('isActive');

  useEffect(() => {
    if (open && plan) {
      setValue('name', plan.name);
      setValue('description', plan.description || '');
      setValue('priceMonthly', plan.priceMonthly?.toString() || '');
      setValue('priceYearly', plan.priceYearly?.toString() || '');
      setValue('currency', plan.currency || 'INR');
      setValue('maxUsers', plan.maxUsers?.toString() || '');
      setValue('maxEmployees', plan.maxEmployees?.toString() || '');
      setValue('maxStorageMb', plan.maxStorageMb?.toString() || '');
      setValue('displayOrder', plan.displayOrder?.toString() || '0');
      setValue('isActive', plan.isActive);
      fetchModulesAndPlanModules();
    }
  }, [open, plan, setValue]);

  const fetchModulesAndPlanModules = async () => {
    setIsLoadingModules(true);
    try {
      // getPlanModules returns all modules with isAssigned flag
      const modulesWithStatus = await getPlanModules(plan.id);
      setModules(modulesWithStatus);
      // Set selected modules - filter those with isAssigned: true
      const assignedModuleIds = modulesWithStatus
        .filter((m) => m.isAssigned)
        .map((m) => m.id);
      setSelectedModuleIds(assignedModuleIds);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      toast.error('Failed to load modules');
    } finally {
      setIsLoadingModules(false);
    }
  };

  const handleModuleToggle = (moduleId: number, isCore: boolean) => {
    // Core modules cannot be deselected
    if (isCore) return;

    setSelectedModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Update plan details
      await updateSubscriptionPlan(plan.id, {
        name: data.name,
        description: data.description || undefined,
        priceMonthly: data.priceMonthly ? parseFloat(data.priceMonthly) : undefined,
        priceYearly: data.priceYearly ? parseFloat(data.priceYearly) : undefined,
        currency: data.currency,
        maxUsers: data.maxUsers ? parseInt(data.maxUsers) : undefined,
        maxEmployees: data.maxEmployees ? parseInt(data.maxEmployees) : undefined,
        maxStorageMb: data.maxStorageMb ? parseInt(data.maxStorageMb) : undefined,
        displayOrder: data.displayOrder ? parseInt(data.displayOrder) : 0,
        isActive: data.isActive,
      });

      // Update plan modules separately
      await updatePlanModules(plan.id, selectedModuleIds);

      toast.success('Subscription plan updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subscription plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAuditUserName = (user: SubscriptionPlan['creator'] | SubscriptionPlan['updater']) => {
    if (!user) return 'System';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Edit Subscription Plan
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Update plan settings, pricing, and modules
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Plan Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  disabled={isSubmitting}
                  className="h-11"
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Plan Code
                </Label>
                <Input
                  value={plan.code}
                  disabled
                  className="h-11 bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">Code cannot be changed</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Status
            </h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Active Status</p>
                <p className="text-sm text-gray-500">
                  {isActive
                    ? 'Plan is available for new subscriptions'
                    : 'Plan is hidden from new subscriptions'}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked)}
                disabled={isSubmitting}
              />
            </div>
            {plan._count && plan._count.organizations > 0 && (
              <p className="text-sm text-amber-600">
                Note: {plan._count.organizations} organization
                {plan._count.organizations !== 1 ? 's are' : ' is'} currently using this plan.
              </p>
            )}
          </div>

          {/* Included Modules */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Included Modules
            </h3>
            <p className="text-xs text-gray-500">
              Select the modules included in this plan. Core modules are required and cannot be removed.
            </p>
            {isLoadingModules ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-500">Loading modules...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...modules].sort((a, b) => (b.isCore ? 1 : 0) - (a.isCore ? 1 : 0)).map((module) => {
                  const isSelected = selectedModuleIds.includes(module.id);
                  return (
                    <div
                      key={module.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      } ${module.isCore ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:border-blue-200'}`}
                      onClick={() => handleModuleToggle(module.id, module.isCore)}
                    >
                      <div
                        className={`mt-0.5 size-4 shrink-0 rounded border flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 bg-white'
                        } ${module.isCore ? 'opacity-60' : ''}`}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              module.isCore ? 'text-gray-700' : 'text-gray-900'
                            }`}
                          >
                            {module.name}
                          </span>
                          {module.isCore && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Core
                            </span>
                          )}
                        </div>
                        {module.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {module.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-gray-500">
              {selectedModuleIds.length} module{selectedModuleIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Pricing */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-medium text-gray-700">
                  Currency
                </Label>
                <Select
                  value={currency}
                  onValueChange={(value) => setValue('currency', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="!h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[200px]">
                    <SelectItem value="INR">INR (Indian Rupee)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceMonthly" className="text-sm font-medium text-gray-700">
                  Monthly Price
                </Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  step="0.01"
                  {...register('priceMonthly')}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceYearly" className="text-sm font-medium text-gray-700">
                  Yearly Price
                </Label>
                <Input
                  id="priceYearly"
                  type="number"
                  step="0.01"
                  {...register('priceYearly')}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Limits
            </h3>
            <p className="text-xs text-gray-500">
              Use -1 for unlimited. Leave empty for no limit.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="maxUsers" className="text-sm font-medium text-gray-700">
                  Max Users
                </Label>
                <Input
                  id="maxUsers"
                  type="number"
                  {...register('maxUsers')}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxEmployees" className="text-sm font-medium text-gray-700">
                  Max Employees
                </Label>
                <Input
                  id="maxEmployees"
                  type="number"
                  {...register('maxEmployees')}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStorageMb" className="text-sm font-medium text-gray-700">
                  Max Storage (MB)
                </Label>
                <Input
                  id="maxStorageMb"
                  type="number"
                  {...register('maxStorageMb')}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Display Order */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Display Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="displayOrder" className="text-sm font-medium text-gray-700">
                  Display Order
                </Label>
                <Input
                  id="displayOrder"
                  type="number"
                  {...register('displayOrder')}
                  disabled={isSubmitting}
                  className="h-11"
                />
                <p className="text-xs text-gray-500">Lower numbers appear first</p>
              </div>
            </div>
          </div>

          {/* Audit Information */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Audit Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Created by</p>
                <p className="font-medium text-gray-900">{getAuditUserName(plan.creator)}</p>
                <p className="text-gray-500">{formatDate(plan.createdAt)}</p>
              </div>
              {plan.updater && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Last updated by</p>
                  <p className="font-medium text-gray-900">{getAuditUserName(plan.updater)}</p>
                  <p className="text-gray-500">{formatDate(plan.updatedAt)}</p>
                </div>
              )}
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
              type="submit"
              disabled={isSubmitting}
              className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isSubmitting ? 'Updating...' : 'Update Plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
