'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Organization, UpdateOrganizationProfileData } from '@/lib/types/organization';
import { updateOrganizationProfile } from '@/lib/api/org/organization';
import { getAllCities } from '@/lib/api/org/locations';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  address: z.string().optional(),
  cityId: z.number().optional(),
  postalCode: z.string().optional(),
  organizationTypeId: z.number().optional(),
  industryTypeId: z.number().optional(),
  businessCategoryId: z.number().optional(),
  themePrimaryColor: z.string().optional(),
  themeSecondaryColor: z.string().optional(),
  themeAccentColor: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization;
  orgSlug: string;
  onSuccess: () => void;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  organization,
  orgSlug,
  onSuccess,
}: EditProfileDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    // resolver: zodResolver(formSchema), // Temporarily disabled to test
    shouldUnregister: false, // Keep field values when unmounted
    mode: 'onSubmit',
    defaultValues: {
      name: organization.name,
      email: organization.email,
      phone: organization.phone || '',
      address: organization.address || '',
      cityId: organization.cityId || undefined,
      postalCode: organization.postalCode || '',
      organizationTypeId: organization.organizationTypeId || undefined,
      industryTypeId: organization.industryTypeId || undefined,
      businessCategoryId: organization.businessCategoryId || undefined,
      themePrimaryColor: organization.themePrimaryColor || '#3B82F6',
      themeSecondaryColor: organization.themeSecondaryColor || '#8B5CF6',
      themeAccentColor: organization.themeAccentColor || '#EC4899',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setLogoFile(null);
      setLogoPreview(null);
      reset({
        name: organization.name,
        email: organization.email,
        phone: organization.phone || '',
        address: organization.address || '',
        cityId: organization.cityId || undefined,
        postalCode: organization.postalCode || '',
        organizationTypeId: organization.organizationTypeId || undefined,
        industryTypeId: organization.industryTypeId || undefined,
        businessCategoryId: organization.businessCategoryId || undefined,
        themePrimaryColor: organization.themePrimaryColor || '#3B82F6',
        themeSecondaryColor: organization.themeSecondaryColor || '#8B5CF6',
        themeAccentColor: organization.themeAccentColor || '#EC4899',
      });
    }
  }, [open, organization, reset]);

  // Load cities
  useEffect(() => {
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const citiesData = await getAllCities(orgSlug);
        setCities(citiesData);
      } catch (error) {
        console.error('Failed to load cities:', error);
        toast.error('Failed to load cities');
      } finally {
        setLoadingCities(false);
      }
    };

    if (open) {
      loadCities();
    }
  }, [open, orgSlug]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setLogoFile(file);

      // Create preview using FileReader
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    console.log('🔥 onSubmit called with data:', data);
    setIsSubmitting(true);
    try {
      console.log('🔥 Building updateData object...');
      const updateData: UpdateOrganizationProfileData = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        address: data.address || undefined,
        cityId: data.cityId,
        postalCode: data.postalCode || undefined,
        organizationTypeId: data.organizationTypeId,
        industryTypeId: data.industryTypeId,
        businessCategoryId: data.businessCategoryId,
        themePrimaryColor: data.themePrimaryColor?.toUpperCase(),
        themeSecondaryColor: data.themeSecondaryColor?.toUpperCase(),
        themeAccentColor: data.themeAccentColor?.toUpperCase(),
      };
      console.log('🔥 updateData:', updateData);

      console.log('🔥 Calling updateOrganizationProfile API...');
      await updateOrganizationProfile(orgSlug, updateData, logoFile);

      console.log('🔥 API call successful!');
      toast.success('Organization profile updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('🔥 Error in onSubmit:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      console.log('🔥 onSubmit finally block');
      setIsSubmitting(false);
    }
  };

  const nextStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault(); // Prevent form submission
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault(); // Prevent form submission
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Basic Information & Branding</h3>

      {/* Logo Upload */}
      <div>
        <Label>Organization Logo</Label>
        <div className="mt-2 flex items-center gap-4">
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex-shrink-0 border-2 border-gray-200">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
            ) : organization.logo ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${organization.logo}`}
                alt="Current logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white text-2xl font-bold">
                {organization.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              id="logo-upload"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Logo
            </Button>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
          </div>
        </div>
      </div>

      {/* Organization Name */}
      <div>
        <Label htmlFor="name">
          Organization Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter organization name"
          className="mt-1"
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="contact@organization.com"
          className="mt-1"
        />
        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder="+1 (555) 123-4567"
          className="mt-1"
        />
        {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>}
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          {...register('address')}
          placeholder="Enter organization address"
          rows={3}
          className="mt-1"
        />
        {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Location & Classification</h3>

      {/* City Selection */}
      <div>
        <Label htmlFor="cityId">City</Label>
        <Select
          value={watch('cityId')?.toString()}
          onValueChange={(value) => setValue('cityId', parseInt(value))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            {loadingCities ? (
              <div className="p-2 text-center text-sm text-gray-500">Loading cities...</div>
            ) : (
              cities.map((city) => (
                <SelectItem key={city.id} value={city.id.toString()}>
                  {city.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">State and country will be auto-filled</p>
      </div>

      {/* Postal Code */}
      <div>
        <Label htmlFor="postalCode">Postal Code</Label>
        <Input
          id="postalCode"
          {...register('postalCode')}
          placeholder="Enter postal code"
          className="mt-1"
        />
      </div>

      {/* Organization Type - Placeholder for now */}
      <div>
        <Label htmlFor="organizationTypeId">Organization Type</Label>
        <Input
          id="organizationTypeId"
          type="number"
          {...register('organizationTypeId', { valueAsNumber: true })}
          placeholder="Organization Type ID"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Current: {organization.organizationType?.name || 'Not set'}
        </p>
      </div>

      {/* Industry Type - Placeholder for now */}
      <div>
        <Label htmlFor="industryTypeId">Industry Type</Label>
        <Input
          id="industryTypeId"
          type="number"
          {...register('industryTypeId', { valueAsNumber: true })}
          placeholder="Industry Type ID"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Current: {organization.industryType?.name || 'Not set'}
        </p>
      </div>

      {/* Business Category - Placeholder for now */}
      <div>
        <Label htmlFor="businessCategoryId">Business Category</Label>
        <Input
          id="businessCategoryId"
          type="number"
          {...register('businessCategoryId', { valueAsNumber: true })}
          placeholder="Business Category ID"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Current: {organization.businessCategory?.name || 'Not set'}
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Theme Customization</h3>
      <p className="text-sm text-gray-600">
        Customize your organization's brand colors. These will be used for future branding features.
      </p>

      {/* Primary Color */}
      <div>
        <Label htmlFor="themePrimaryColor">Primary Color</Label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            id="themePrimaryColor"
            value={watch('themePrimaryColor') || '#3B82F6'}
            onChange={(e) => setValue('themePrimaryColor', e.target.value, { shouldValidate: true })}
            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
          />
          <Input
            {...register('themePrimaryColor')}
            placeholder="#3B82F6"
            className="flex-1 font-mono uppercase"
          />
        </div>
        {errors.themePrimaryColor && (
          <p className="text-sm text-red-500 mt-1">{errors.themePrimaryColor.message}</p>
        )}
      </div>

      {/* Secondary Color */}
      <div>
        <Label htmlFor="themeSecondaryColor">Secondary Color</Label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            id="themeSecondaryColor"
            value={watch('themeSecondaryColor') || '#8B5CF6'}
            onChange={(e) => setValue('themeSecondaryColor', e.target.value, { shouldValidate: true })}
            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
          />
          <Input
            {...register('themeSecondaryColor')}
            placeholder="#8B5CF6"
            className="flex-1 font-mono uppercase"
          />
        </div>
        {errors.themeSecondaryColor && (
          <p className="text-sm text-red-500 mt-1">{errors.themeSecondaryColor.message}</p>
        )}
      </div>

      {/* Accent Color */}
      <div>
        <Label htmlFor="themeAccentColor">Accent Color</Label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            id="themeAccentColor"
            value={watch('themeAccentColor') || '#EC4899'}
            onChange={(e) => setValue('themeAccentColor', e.target.value, { shouldValidate: true })}
            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
          />
          <Input
            {...register('themeAccentColor')}
            placeholder="#EC4899"
            className="flex-1 font-mono uppercase"
          />
        </div>
        {errors.themeAccentColor && (
          <p className="text-sm text-red-500 mt-1">{errors.themeAccentColor.message}</p>
        )}
      </div>

      {/* Color Preview */}
      <div className="mt-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm font-medium text-gray-900 mb-3">Color Preview</p>
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-lg border-2 border-white shadow-sm"
            style={{ backgroundColor: watch('themePrimaryColor') || '#3B82F6' }}
          />
          <div
            className="w-16 h-16 rounded-lg border-2 border-white shadow-sm"
            style={{ backgroundColor: watch('themeSecondaryColor') || '#8B5CF6' }}
          />
          <div
            className="w-16 h-16 rounded-lg border-2 border-white shadow-sm"
            style={{ backgroundColor: watch('themeAccentColor') || '#EC4899' }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Organization Profile</DialogTitle>
          <DialogDescription>
            Update your organization's information and branding
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  step === currentStep
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : step < currentStep
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {step < currentStep ? <Check className="w-5 h-5" /> : step}
              </div>
              {step < 3 && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    step < currentStep ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step Content - All steps always rendered, visibility controlled by CSS */}
          <div className="min-h-[400px]">
            <div className={currentStep !== 1 ? 'hidden' : ''}>
              {renderStep1()}
            </div>
            <div className={currentStep !== 2 ? 'hidden' : ''}>
              {renderStep2()}
            </div>
            <div className={currentStep !== 3 ? 'hidden' : ''}>
              {renderStep3()}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="text-sm text-gray-500">
              Step {currentStep} of 3
            </div>

            {currentStep < 3 ? (
              <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
