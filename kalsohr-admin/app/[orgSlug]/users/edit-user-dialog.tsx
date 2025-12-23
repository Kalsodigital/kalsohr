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
import { updateOrgUser } from '@/lib/api/org/users';
import { OrgUser, OrgRole } from '@/lib/types/org';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  roleId: z.number().optional(),
  isActive: z.boolean(),
  password: z.string().optional().refine((val) => {
    if (!val || val === '') return true; // Optional
    return val.length >= 8;
  }, 'Password must be at least 8 characters')
    .refine((val) => {
      if (!val || val === '') return true;
      return /[A-Z]/.test(val);
    }, 'Password must contain at least one uppercase letter')
    .refine((val) => {
      if (!val || val === '') return true;
      return /[a-z]/.test(val);
    }, 'Password must contain at least one lowercase letter')
    .refine((val) => {
      if (!val || val === '') return true;
      return /[0-9]/.test(val);
    }, 'Password must contain at least one number'),
});

type FormData = z.infer<typeof schema>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  user: OrgUser;
  roles: OrgRole[];
  onSuccess: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  orgSlug,
  user,
  roles,
  onSuccess,
}: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  // Load user data when dialog opens
  useEffect(() => {
    if (open && user) {
      setValue('firstName', user.firstName);
      setValue('lastName', user.lastName);
      setValue('phone', user.phone || '');
      setValue('roleId', user.role?.id);
      setValue('isActive', user.isActive);
      setValue('password', ''); // Don't pre-fill password
    }
  }, [open, user, setValue]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Build update payload
      const updatePayload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        roleId: data.roleId,
        isActive: data.isActive,
      };

      // Only include password if it was provided
      if (data.password && data.password.trim() !== '') {
        updatePayload.password = data.password;
      }

      await updateOrgUser(orgSlug, user.id, updatePayload);
      toast.success('User updated successfully');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Edit User
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Update user information for {user.firstName} {user.lastName}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Non-editable Fields Display */}
          <div className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Account Information</h3>
            <div>
              <Label className="text-xs font-medium text-gray-500">Email</Label>
              <p className="text-sm font-medium text-gray-900 mt-1">{user.email}</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Email cannot be changed after user creation
            </p>
          </div>

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  disabled={isSubmitting}
                  className="h-11"
                  placeholder="John"
                />
                {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  disabled={isSubmitting}
                  className="h-11"
                  placeholder="Doe"
                />
                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
              </div>
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
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          {/* Password Reset Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Password Reset</h3>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                New Password (optional)
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  disabled={isSubmitting}
                  className="h-11 pr-10"
                  placeholder="Leave blank to keep current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
              <p className="text-xs text-gray-500">
                Only fill this if you want to change the user's password
              </p>
            </div>
          </div>

          {/* Role Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Role Assignment</h3>
            <div className="space-y-2">
              <Label htmlFor="roleId" className="text-sm font-medium text-gray-700">
                Role
              </Label>
              <Select
                value={watch('roleId')?.toString()}
                onValueChange={(value) => setValue('roleId', parseInt(value))}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select role (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {roles.length > 0 ? (
                    roles.filter(role => role.isActive).map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                        {role.isSystem && <span className="text-xs text-gray-500 ml-2">(System)</span>}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No roles available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Role determines user permissions within your organization
              </p>
            </div>
          </div>

          {/* Status Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Account Status</h3>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                disabled={isSubmitting}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <Label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                Active (can login and access the system)
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              Inactive users cannot login but their data is preserved
            </p>
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
              {isSubmitting ? 'Updating...' : 'Update User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
