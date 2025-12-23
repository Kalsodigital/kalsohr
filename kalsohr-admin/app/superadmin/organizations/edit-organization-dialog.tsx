'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { updateOrganization, getOrganizationById, getOrganizationModules, updateOrganizationModules } from '@/lib/api/organizations';
import { getAllCountries, Country, State } from '@/lib/api/masters/countries';
import { getAllStates } from '@/lib/api/masters/states';
import { getAllCities, City } from '@/lib/api/masters/cities';
import { getAllOrganizationTypes, OrganizationType } from '@/lib/api/masters/organization-types';
import { getAllIndustryTypes, IndustryType } from '@/lib/api/masters/industry-types';
import { getAllBusinessCategories, BusinessCategory } from '@/lib/api/masters/business-categories';
import { Organization, SubscriptionPlan } from '@/lib/types/organization';
import { Info, Package } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  countryId: z.number().optional(),
  stateId: z.number().optional(),
  cityId: z.number().optional(),
  postalCode: z.string().optional(),
  organizationTypeId: z.number().optional(),
  industryTypeId: z.number().optional(),
  businessCategoryId: z.number().optional(),
  subscriptionPlanId: z.number(),
  subscriptionExpiryDate: z.string().optional(),
  status: z.string(),
});

type FormData = z.infer<typeof schema>;

interface OrganizationModuleWithStatus {
  id: number;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  isCore: boolean;
  displayOrder: number;
  isActive: boolean;
  isEnabled: boolean;
  canDisable: boolean;
}

interface EditOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization;
  onSuccess: () => void;
  subscriptionPlans: SubscriptionPlan[];
}

export function EditOrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSuccess,
  subscriptionPlans,
}: EditOrganizationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>([]);
  const [industryTypes, setIndustryTypes] = useState<IndustryType[]>([]);
  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);
  const [orgModules, setOrgModules] = useState<OrganizationModuleWithStatus[]>([]);
  const [moduleChanges, setModuleChanges] = useState<Map<number, boolean>>(new Map());

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedPlanId = watch('subscriptionPlanId');
  const selectedStatus = watch('status');
  const cityId = watch('cityId');

  // Load master data on mount
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [countriesData, statesData, citiesData, orgTypesData, industryTypesData, businessCatsData] = await Promise.all([
          getAllCountries(true), // only active
          getAllStates(),
          getAllCities(true), // only active
          getAllOrganizationTypes(true), // only active
          getAllIndustryTypes(true), // only active
          getAllBusinessCategories(true), // only active
        ]);
        setCountries(countriesData);
        setStates(statesData);
        setCities(citiesData);
        setOrganizationTypes(orgTypesData);
        setIndustryTypes(industryTypesData);
        setBusinessCategories(businessCatsData);
      } catch (error) {
        console.error('Failed to load master data:', error);
        toast.error('Failed to load location data');
      }
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    if (open && organization) {
      loadOrganization();
    }
  }, [open, organization]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      setModuleChanges(new Map()); // Reset changes

      // Load organization details and modules in parallel
      const [fullOrg, modulesData] = await Promise.all([
        getOrganizationById(organization.id),
        getOrganizationModules(organization.id),
      ]);

      setValue('name', fullOrg.name);
      setValue('email', fullOrg.email);
      setValue('phone', fullOrg.phone || '');
      setValue('address', fullOrg.address || '');
      setValue('subscriptionPlanId', fullOrg.subscriptionPlanId);
      setValue('status', fullOrg.status);

      // Set location fields
      if (fullOrg.countryId) {
        setValue('countryId', fullOrg.countryId);
      }
      if (fullOrg.stateId) {
        setValue('stateId', fullOrg.stateId);
      }
      if (fullOrg.cityId) {
        setValue('cityId', fullOrg.cityId);
      }
      if (fullOrg.postalCode) {
        setValue('postalCode', fullOrg.postalCode);
      }

      if (fullOrg.subscriptionExpiryDate) {
        const date = new Date(fullOrg.subscriptionExpiryDate);
        setValue('subscriptionExpiryDate', date.toISOString().split('T')[0]);
      }

      // Set classification fields
      if (fullOrg.organizationTypeId) {
        setValue('organizationTypeId', fullOrg.organizationTypeId);
      }
      if (fullOrg.industryTypeId) {
        setValue('industryTypeId', fullOrg.industryTypeId);
      }
      if (fullOrg.businessCategoryId) {
        setValue('businessCategoryId', fullOrg.businessCategoryId);
      }

      // Set organization modules
      setOrgModules(modulesData.modules || []);
    } catch (error) {
      console.error('Failed to load organization:', error);
      toast.error('Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  // City-first handler - auto-populates state and country
  const handleCityChange = (value: string) => {
    const selectedCityId = Number(value);
    setValue('cityId', selectedCityId);

    // Find the selected city
    const selectedCity = cities.find(c => c.id === selectedCityId);
    if (selectedCity) {
      // Auto-populate state
      setValue('stateId', selectedCity.stateId);

      // Find the state to get country
      const selectedState = states.find(s => s.id === selectedCity.stateId);
      if (selectedState) {
        // Auto-populate country
        setValue('countryId', selectedState.countryId);
      }
    }
  };

  const handleModuleToggle = (moduleId: number, isEnabled: boolean) => {
    setModuleChanges((prev) => {
      const newMap = new Map(prev);
      newMap.set(moduleId, isEnabled);
      return newMap;
    });
  };

  const getModuleEnabled = (module: OrganizationModuleWithStatus): boolean => {
    if (moduleChanges.has(module.id)) {
      return moduleChanges.get(module.id)!;
    }
    return module.isEnabled;
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Update organization details
      await updateOrganization(organization.id, data);

      // Update module status if any changes were made
      if (moduleChanges.size > 0) {
        const moduleUpdates = Array.from(moduleChanges.entries()).map(([orgModuleId, isEnabled]) => ({
          orgModuleId,
          isEnabled,
        }));
        await updateOrganizationModules(organization.id, moduleUpdates);
      }

      toast.success('Organization updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Organization</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Edit Organization
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">Update organization information and settings</p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Organization Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  disabled={isSubmitting}
                  className="h-11"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Slug
                </Label>
                <Input
                  value={organization.slug}
                  disabled
                  className="h-11 bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">Slug cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled={isSubmitting}
                  className="h-11"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                Address
              </Label>
              <Input
                id="address"
                {...register('address')}
                disabled={isSubmitting}
                className="h-11"
              />
            </div>

            {/* Location Fields - City First */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cityId" className="text-sm font-medium text-gray-700">
                  City
                </Label>
                <Select
                  value={cityId?.toString()}
                  onValueChange={handleCityChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="cityId" className="!h-11 w-full">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id.toString()}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stateId" className="text-sm font-medium text-gray-700">
                  State
                </Label>
                <Input
                  id="stateId"
                  value={watch('stateId') ? states.find(s => s.id === watch('stateId'))?.name || '' : ''}
                  disabled
                  className="h-11 bg-gray-50 cursor-not-allowed"
                  placeholder="Auto-filled"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="countryId" className="text-sm font-medium text-gray-700">
                  Country
                </Label>
                <Input
                  id="countryId"
                  value={watch('countryId') ? countries.find(c => c.id === watch('countryId'))?.name || '' : ''}
                  disabled
                  className="h-11 bg-gray-50 cursor-not-allowed"
                  placeholder="Auto-filled"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">
                  Pincode
                </Label>
                <Input
                  id="postalCode"
                  {...register('postalCode')}
                  disabled={isSubmitting}
                  className="h-11"
                  placeholder="e.g., 400001"
                />
              </div>
            </div>
          </div>

          {/* Organization Classification Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Organization Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="organizationTypeId" className="text-sm font-medium text-gray-700">
                  Organization Type
                </Label>
                <Select
                  value={watch('organizationTypeId')?.toString()}
                  onValueChange={(value) => setValue('organizationTypeId', parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="organizationTypeId" className="!h-11 w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industryTypeId" className="text-sm font-medium text-gray-700">
                  Industry Type
                </Label>
                <Select
                  value={watch('industryTypeId')?.toString()}
                  onValueChange={(value) => setValue('industryTypeId', parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="industryTypeId" className="!h-11 w-full">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessCategoryId" className="text-sm font-medium text-gray-700">
                  Business Category
                </Label>
                <Select
                  value={watch('businessCategoryId')?.toString()}
                  onValueChange={(value) => setValue('businessCategoryId', parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="businessCategoryId" className="!h-11 w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Subscription Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="subscriptionPlanId" className="text-sm font-medium text-gray-700">
                  Subscription Plan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedPlanId?.toString()}
                  onValueChange={(value) => setValue('subscriptionPlanId', parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="!h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriptionExpiryDate" className="text-sm font-medium text-gray-700">
                  Expiry Date
                </Label>
                <Input
                  id="subscriptionExpiryDate"
                  type="date"
                  {...register('subscriptionExpiryDate')}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                  Status
                </Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => setValue('status', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="!h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Modules Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Enabled Modules</h3>
              <Badge variant="secondary" className="text-xs">
                <Package className="w-3 h-3 mr-1" />
                From Subscription Plan
              </Badge>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Module Configuration</p>
                <p className="mt-1">
                  Modules are assigned based on the subscription plan. You can disable optional modules
                  but cannot add new ones. Core modules are always enabled.
                </p>
              </div>
            </div>

            {orgModules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...orgModules].sort((a, b) => (b.isCore ? 1 : 0) - (a.isCore ? 1 : 0)).map((module) => {
                  const isEnabled = getModuleEnabled(module);
                  return (
                    <div
                      key={module.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isEnabled
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{module.name}</span>
                          {module.isCore && (
                            <Badge variant="default" className="text-xs bg-blue-600">
                              Core
                            </Badge>
                          )}
                        </div>
                        {module.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{module.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleModuleToggle(module.id, checked)}
                        disabled={!module.canDisable || isSubmitting}
                        className={`ml-2 ${!module.canDisable ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No modules available for this subscription plan.
              </div>
            )}
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
              {isSubmitting ? 'Updating...' : 'Update Organization'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
