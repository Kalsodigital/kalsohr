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
import { toast } from 'sonner';
import { updateRole, Role } from '@/lib/api/roles';

const schema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  code: z.string().min(2, 'Role code must be at least 2 characters').optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  onSuccess: () => void;
}

export function EditRoleDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: EditRoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    if (open && role) {
      setValue('name', role.name);
      setValue('code', role.code || '');
      setValue('description', role.description || '');
      setValue('isActive', role.isActive);
    }
  }, [open, role, setValue]);

  const onSubmit = async (data: FormData) => {
    if (role.isSystem) {
      toast.error('Cannot edit system roles');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateRole(role.id, {
        name: data.name,
        code: data.code,
        description: data.description,
        isActive: data.isActive,
      });

      toast.success('Role updated successfully');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Edit Role
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Update role information for {role.name}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Role Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Role Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              disabled={isSubmitting || role.isSystem}
              className="h-11"
              placeholder="e.g., Organizations Manager"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Role Code */}
          <div className="space-y-2">
            <Label htmlFor="code" className="text-sm font-medium text-gray-700">
              Role Code (Optional)
            </Label>
            <Input
              id="code"
              {...register('code')}
              disabled={isSubmitting || role.isSystem}
              className="h-11 font-mono"
              placeholder="e.g., ORG_MANAGER"
            />
            {errors.code && (
              <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              disabled={isSubmitting || role.isSystem}
              className="min-h-[100px]"
              placeholder="Describe what this role can do..."
            />
          </div>

          {/* Status */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Status</h3>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                disabled={isSubmitting || role.isSystem}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <Label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                Active (can be assigned to users)
              </Label>
            </div>
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
              disabled={isSubmitting || role.isSystem}
              className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isSubmitting ? 'Updating...' : 'Update Role'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
