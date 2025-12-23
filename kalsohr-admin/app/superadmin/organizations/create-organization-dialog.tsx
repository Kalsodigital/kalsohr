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
import { toast } from 'sonner';
import { createOrganization, getPlanModules } from '@/lib/api/organizations';
import { getAllCountries, Country, State } from '@/lib/api/masters/countries';
import { getAllStates } from '@/lib/api/masters/states';
import { getAllCities, City } from '@/lib/api/masters/cities';
import { getAllOrganizationTypes, OrganizationType } from '@/lib/api/masters/organization-types';
import { getAllIndustryTypes, IndustryType } from '@/lib/api/masters/industry-types';
import { getAllBusinessCategories, BusinessCategory } from '@/lib/api/masters/business-categories';
import { SubscriptionPlan, OrgModule } from '@/lib/types/organization';
import { Wand2, Info } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  countryId: z.number(),
  stateId: z.number(),
  cityId: z.number(),
  postalCode: z.string().optional(),
  // Organization classification
  organizationTypeId: z.number().optional(),
  industryTypeId: z.number().optional(),
  businessCategoryId: z.number().optional(),
  // Subscription
  subscriptionPlanId: z.number(),
  subscriptionTenure: z.enum(['monthly', 'yearly']),
  subscriptionExpiryDate: z.string().optional(),
  // Admin user fields
  adminFirstName: z.string().min(2, 'First name must be at least 2 characters'),
  adminLastName: z.string().min(2, 'Last name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid admin email'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  subscriptionPlans: SubscriptionPlan[];
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
  subscriptionPlans,
}: CreateOrganizationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualSlugEdit, setManualSlugEdit] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>([]);
  const [industryTypes, setIndustryTypes] = useState<IndustryType[]>([]);
  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);
  const [planModules, setPlanModules] = useState<(OrgModule & { isAssigned: boolean })[]>([]);
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
    defaultValues: {
      name: '',
      slug: '',
      email: '',
      phone: '',
      address: '',
      countryId: undefined,
      stateId: undefined,
      cityId: undefined,
      postalCode: '',
      organizationTypeId: undefined,
      industryTypeId: undefined,
      businessCategoryId: undefined,
      subscriptionPlanId: undefined,
      subscriptionTenure: 'yearly' as const,
      subscriptionExpiryDate: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
    },
  });

  const selectedPlanId = watch('subscriptionPlanId');
  const subscriptionTenure = watch('subscriptionTenure');
  const nameValue = watch('name');
  const cityId = watch('cityId');

  // Auto-calculate expiry date based on tenure
  useEffect(() => {
    if (subscriptionTenure) {
      const today = new Date();
      let expiryDate: Date;

      if (subscriptionTenure === 'monthly') {
        expiryDate = new Date(today.setMonth(today.getMonth() + 1));
      } else {
        expiryDate = new Date(today.setFullYear(today.getFullYear() + 1));
      }

      setValue('subscriptionExpiryDate', expiryDate.toISOString().split('T')[0]);
    }
  }, [subscriptionTenure, setValue]);

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

  // Load plan modules when plan changes
  useEffect(() => {
    if (selectedPlanId) {
      loadPlanModules(selectedPlanId);
    } else {
      setPlanModules([]);
    }
  }, [selectedPlanId]);

  const loadPlanModules = async (planId: number) => {
    setIsLoadingModules(true);
    try {
      const modules = await getPlanModules(planId);
      setPlanModules(modules);
    } catch (error) {
      console.error('Failed to load plan modules:', error);
    } finally {
      setIsLoadingModules(false);
    }
  };

  // Auto-generate slug from name
  useEffect(() => {
    if (nameValue && !manualSlugEdit) {
      const generatedSlug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setValue('slug', generatedSlug);
    }
  }, [nameValue, manualSlugEdit, setValue]);

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createOrganization(data);
      toast.success('Organization created successfully');
      reset();
      setPlanModules([]);
      setManualSlugEdit(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDummyData = () => {
    const randomNum = Math.floor(Math.random() * 1000);

    setValue('name', `Test Organization ${randomNum}`);
    setValue('slug', `test-org-${randomNum}`);
    setValue('email', `contact${randomNum}@testorg.com`);
    setValue('phone', `+1 (555) ${String(randomNum).padStart(3, '0')}-0000`);
    setValue('address', `${randomNum} Test Street`);

    // Set first city if available (auto-populates state and country)
    if (cities.length > 0) {
      const firstCity = cities[0];
      setValue('cityId', firstCity.id);

      // Auto-populate state
      setValue('stateId', firstCity.stateId);

      // Find state to get country
      const cityState = states.find(s => s.id === firstCity.stateId);
      if (cityState) {
        setValue('countryId', cityState.countryId);
      }
    }

    setValue('postalCode', `${randomNum}`.padStart(6, '0'));

    // Set first organization type if available
    if (organizationTypes.length > 0) {
      setValue('organizationTypeId', organizationTypes[0].id);
    }

    // Set first industry type if available
    if (industryTypes.length > 0) {
      setValue('industryTypeId', industryTypes[0].id);
    }

    // Set first business category if available
    if (businessCategories.length > 0) {
      setValue('businessCategoryId', businessCategories[0].id);
    }

    // Set first subscription plan if available
    if (subscriptionPlans.length > 0) {
      setValue('subscriptionPlanId', subscriptionPlans[0].id);
    }

    // Set tenure to yearly (expiry date will be auto-calculated)
    setValue('subscriptionTenure', 'yearly');

    // Admin user dummy data
    setValue('adminFirstName', 'Admin');
    setValue('adminLastName', 'User');
    setValue('adminEmail', `admin${randomNum}@testorg.com`);
    setValue('adminPassword', 'Password123!');

    setManualSlugEdit(false);
    toast.success('Dummy data filled!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Create New Organization
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillDummyData}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Fill Dummy Data
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Organization Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="Acme Corporation"
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-sm font-medium text-gray-700">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  {...register('slug')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="acme-corporation"
                  onChange={(e) => {
                    setManualSlugEdit(true);
                    register('slug').onChange(e);
                  }}
                />
                {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="contact@acme.com"
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                  Address
                </Label>
                <Input
                  id="address"
                  {...register('address')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="123 Business St"
                />
              </div>
            </div>

            {/* Location Fields - City First */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cityId" className="text-sm font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={cityId?.toString()}
                  onValueChange={handleCityChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="cityId" className="!h-10 w-full">
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
                {errors.cityId && (
                  <p className="text-xs text-red-600">{errors.cityId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stateId" className="text-sm font-medium text-gray-700">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="stateId"
                  value={watch('stateId') ? states.find(s => s.id === watch('stateId'))?.name || '' : ''}
                  disabled
                  className="h-10 bg-gray-50 cursor-not-allowed"
                  placeholder="Auto-filled"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="countryId" className="text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="countryId"
                  value={watch('countryId') ? countries.find(c => c.id === watch('countryId'))?.name || '' : ''}
                  disabled
                  className="h-10 bg-gray-50 cursor-not-allowed"
                  placeholder="Auto-filled"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">
                  Pincode
                </Label>
                <Input
                  id="postalCode"
                  {...register('postalCode')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="e.g., 400001"
                />
              </div>
              <div></div>
              <div></div>
            </div>

            <p className="text-xs text-gray-500 -mt-2">
              Slug is auto-generated from organization name (editable)
            </p>
          </div>

          {/* Organization Classification Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Organization Classification</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="organizationTypeId" className="text-sm font-medium text-gray-700">
                  Organization Type
                </Label>
                <Select
                  value={watch('organizationTypeId')?.toString()}
                  onValueChange={(value) => setValue('organizationTypeId', parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="organizationTypeId" className="!h-10 w-full">
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

              <div className="space-y-1.5">
                <Label htmlFor="industryTypeId" className="text-sm font-medium text-gray-700">
                  Industry Type
                </Label>
                <Select
                  value={watch('industryTypeId')?.toString()}
                  onValueChange={(value) => setValue('industryTypeId', parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="industryTypeId" className="!h-10 w-full">
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

              <div className="space-y-1.5">
                <Label htmlFor="businessCategoryId" className="text-sm font-medium text-gray-700">
                  Business Category
                </Label>
                <Select
                  value={watch('businessCategoryId')?.toString()}
                  onValueChange={(value) => setValue('businessCategoryId', parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="businessCategoryId" className="!h-10 w-full">
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
            <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="subscriptionPlanId" className="text-sm font-medium text-gray-700">
                Subscription Plan <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedPlanId?.toString()}
                onValueChange={(value) => setValue('subscriptionPlanId', parseInt(value))}
                disabled={isSubmitting}
              >
                <SelectTrigger className="!h-10 w-full">
                  <SelectValue placeholder="Select subscription plan" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subscriptionPlanId && (
                <p className="text-xs text-red-600">Subscription plan is required</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subscriptionTenure" className="text-sm font-medium text-gray-700">
                Tenure <span className="text-red-500">*</span>
              </Label>
              <Select
                value={subscriptionTenure}
                onValueChange={(value: 'monthly' | 'yearly') => setValue('subscriptionTenure', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="!h-10 w-full">
                  <SelectValue placeholder="Select tenure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              {errors.subscriptionTenure && (
                <p className="text-xs text-red-600">Tenure is required</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subscriptionExpiryDate" className="text-sm font-medium text-gray-700">
                Expiry Date
              </Label>
              <Input
                id="subscriptionExpiryDate"
                type="date"
                {...register('subscriptionExpiryDate')}
                disabled={isSubmitting}
                className="h-10"
              />
            </div>
            </div>
          </div>

          {/* Admin User Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Organization Admin</h3>
              <span className="text-xs text-gray-500">(will be created with full access)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="adminFirstName" className="text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminFirstName"
                  {...register('adminFirstName')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="John"
                />
                {errors.adminFirstName && (
                  <p className="text-xs text-red-600">{errors.adminFirstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminLastName" className="text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminLastName"
                  {...register('adminLastName')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="Doe"
                />
                {errors.adminLastName && (
                  <p className="text-xs text-red-600">{errors.adminLastName.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="adminEmail" className="text-sm font-medium text-gray-700">
                  Admin Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  {...register('adminEmail')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="admin@company.com"
                />
                {errors.adminEmail && (
                  <p className="text-xs text-red-600">{errors.adminEmail.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminPassword" className="text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  {...register('adminPassword')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="Min. 8 characters"
                />
                {errors.adminPassword && (
                  <p className="text-xs text-red-600">{errors.adminPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Modules Info Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Included Modules</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">
                    Modules are automatically assigned from the subscription plan
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Organizations inherit modules from their subscription plan. After creation, you can disable optional modules if needed.
                  </p>
                </div>
              </div>
            </div>
            {selectedPlanId && (
              <div className="mt-3">
                {(() => {
                  const assignedModules = planModules.filter(m => m.isAssigned);
                  return (
                    <>
                      <p className="text-xs text-gray-500 mb-2">
                        The selected plan includes {assignedModules.length} module{assignedModules.length !== 1 ? 's' : ''}:
                      </p>
                      {isLoadingModules ? (
                        <div className="text-sm text-gray-500">Loading modules...</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {assignedModules.map((module) => (
                            <span
                              key={module.id}
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                module.isCore
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {module.name}
                              {module.isCore && (
                                <span className="ml-1 text-blue-600">(Core)</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
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
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
