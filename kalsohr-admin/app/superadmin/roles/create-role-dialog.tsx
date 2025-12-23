'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createRole } from '@/lib/api/roles';

const schema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  code: z.string().min(2, 'Role code must be at least 2 characters').optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateRoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Create platform-level role (organizationId = null)
      await createRole({
        name: data.name,
        code: data.code,
        description: data.description,
        organizationId: null, // Platform-level role
      });

      toast.success('Platform role created successfully');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Create Platform Role
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Create a new role for platform super admin users
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Platform Role:</strong> This role will be available for assignment to super admin users
              who manage the entire platform. Use this for roles like "Organizations Manager",
              "Accounts Manager", "System Administrator", etc.
            </p>
          </div>

          {/* Role Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Role Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              className="h-11 font-mono"
              placeholder="e.g., ORG_MANAGER"
            />
            {errors.code && (
              <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Unique identifier for the role (uppercase with underscores recommended)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              disabled={isSubmitting}
              className="min-h-[100px]"
              placeholder="Describe what this role can do..."
            />
            <p className="text-xs text-gray-500">
              Provide a clear description of this role's responsibilities
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
              {isSubmitting ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
