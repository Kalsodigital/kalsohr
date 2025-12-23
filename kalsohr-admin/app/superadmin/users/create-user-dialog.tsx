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
import { createUser } from '@/lib/api/users';
import { Organization } from '@/lib/types/organization';
import { getOrganizationRoles, getPlatformRoles, Role } from '@/lib/api/roles';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.string().optional(),
  isPlatformUser: z.boolean(),
  organizationId: z.number().optional(),
  roleId: z.number().optional(),
  isActive: z.boolean(),
}).refine(
  (data) => {
    // If not a platform user, organization is required
    if (!data.isPlatformUser && !data.organizationId) {
      return false;
    }
    return true;
  },
  {
    message: 'Organization is required for non-platform users',
    path: ['organizationId'],
  }
);

type FormData = z.infer<typeof schema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizations: Organization[];
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
  organizations,
}: CreateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedOrgRoles, setSelectedOrgRoles] = useState<Role[]>([]);
  const [platformRoles, setPlatformRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPlatformRoles, setLoadingPlatformRoles] = useState(false);

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
      isActive: true,
      isPlatformUser: false,
    },
  });

  const selectedOrgId = watch('organizationId');
  const isPlatformUser = watch('isPlatformUser');

  // Fetch platform roles when dialog opens
  useEffect(() => {
    const fetchPlatformRoles = async () => {
      if (open) {
        try {
          setLoadingPlatformRoles(true);
          const roles = await getPlatformRoles();
          setPlatformRoles(roles);
        } catch (error) {
          console.error('Failed to fetch platform roles:', error);
          toast.error('Failed to load platform roles');
          setPlatformRoles([]);
        } finally {
          setLoadingPlatformRoles(false);
        }
      }
    };

    fetchPlatformRoles();
  }, [open]);

  // When organization changes, fetch its roles
  useEffect(() => {
    const fetchRoles = async () => {
      if (selectedOrgId) {
        try {
          setLoadingRoles(true);
          const roles = await getOrganizationRoles(selectedOrgId);
          setSelectedOrgRoles(roles);
        } catch (error) {
          console.error('Failed to fetch roles:', error);
          toast.error('Failed to load roles for this organization');
          setSelectedOrgRoles([]);
        } finally {
          setLoadingRoles(false);
        }
      } else {
        setSelectedOrgRoles([]);
      }
    };

    fetchRoles();
  }, [selectedOrgId]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Prepare user data
      const userData: any = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        isActive: data.isActive,
        isSuperAdmin: data.isPlatformUser,
      };

      // Add role for both platform and organization users
      if (data.roleId) {
        userData.roleId = data.roleId;
      }

      // Only add organization if not a platform user
      if (!data.isPlatformUser) {
        userData.organizationId = data.organizationId;
      }

      await createUser(userData);
      toast.success(data.isPlatformUser ? 'Platform user created successfully' : 'User created successfully');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOrg = watch('organizationId');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Create New User
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* User Type Selection */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isPlatformUser"
                {...register('isPlatformUser')}
                disabled={isSubmitting}
                onChange={(e) => {
                  setValue('isPlatformUser', e.target.checked);
                  if (e.target.checked) {
                    // Clear organization and role when switching to platform user
                    setValue('organizationId', undefined);
                    setValue('roleId', undefined);
                  }
                }}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="isPlatformUser" className="text-sm font-semibold text-blue-900 cursor-pointer">
                  Platform Super Admin User
                </Label>
                <p className="text-xs text-blue-700 mt-0.5">
                  {isPlatformUser
                    ? "Platform-level super admin (no organization required)"
                    : "Organization-level user (requires organization)"}
                </p>
              </div>
            </div>
          </div>

          {/* All Form Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="John"
                />
                {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  disabled={isSubmitting}
                  className="h-10"
                  placeholder="Doe"
                />
                {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
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
                  placeholder="john.doe@example.com"
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    disabled={isSubmitting}
                    className="h-10 pr-10"
                    placeholder="Strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>
              <div></div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Password must be at least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>

          {/* Separator line before platform role */}
          {isPlatformUser && <div className="border-t border-gray-200"></div>}

          {/* Platform Role - Only for platform users */}
          {isPlatformUser && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="platformRoleId" className="text-sm font-medium text-gray-700">
                  Platform Role
                </Label>
                <Select
                  value={watch('roleId')?.toString()}
                  onValueChange={(value) => setValue('roleId', parseInt(value))}
                  disabled={isSubmitting || loadingPlatformRoles}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder={
                      loadingPlatformRoles ? "Loading platform roles..." :
                      "Select platform role (optional)"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {platformRoles.length > 0 ? (
                      platformRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                          {role.isSystem && <span className="text-xs text-gray-500 ml-2">(System)</span>}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {loadingPlatformRoles ? "Loading..." : "No platform roles available"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Control permissions for this super admin user
                </p>
              </div>
              <div></div>
              <div></div>
            </div>
          )}

          {/* Separator line before org/role */}
          {!isPlatformUser && <div className="border-t border-gray-200"></div>}

          {/* Organization & Role - Only for non-platform users */}
          {!isPlatformUser && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="organizationId" className="text-sm font-medium text-gray-700">
                  Organization <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedOrg?.toString()}
                  onValueChange={(value) => {
                    setValue('organizationId', parseInt(value));
                    setValue('roleId', undefined); // Reset role when org changes
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.organizationId && (
                  <p className="text-xs text-red-600">Organization is required</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roleId" className="text-sm font-medium text-gray-700">
                  Role
                </Label>
                <Select
                  value={watch('roleId')?.toString()}
                  onValueChange={(value) => setValue('roleId', parseInt(value))}
                  disabled={isSubmitting || !selectedOrg || loadingRoles}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder={
                      loadingRoles ? "Loading..." :
                      !selectedOrg ? "Select org first" :
                      "Select role"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOrgRoles.length > 0 ? (
                      selectedOrgRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                          {role.isSystem && <span className="text-xs text-gray-500 ml-2">(System)</span>}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {loadingRoles ? "Loading..." : "No roles available"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div></div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              disabled={isSubmitting}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <Label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
              Active user (can login immediately)
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
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
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
