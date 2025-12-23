'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import apiClient from '@/lib/api/client';

interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
}

interface RoleSelectionDialogProps {
  open: boolean;
  organization: Organization | null;
  onClose: () => void;
  onSelect: (roleId: number | undefined) => void;
}

export function RoleSelectionDialog({
  open,
  organization,
  onClose,
  onSelect,
}: RoleSelectionDialogProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('full-access');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && organization) {
      loadRoles();
    }
  }, [open, organization]);

  const loadRoles = async () => {
    if (!organization) return;

    setLoading(true);
    try {
      const response = await apiClient.get(`/api/v1/${organization.slug}/roles`);
      if (response.data.success) {
        setRoles(response.data.data.roles || []);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedRole === 'full-access') {
      onSelect(undefined); // Full access (no role restriction)
    } else {
      onSelect(parseInt(selectedRole, 10));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Role for Support Mode</DialogTitle>
          <DialogDescription>
            Choose which role to impersonate as when viewing <strong>{organization?.name}</strong>.
            This determines what permissions you'll have in support mode.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="role">View As Role</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading roles...</div>
            ) : (
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-access">
                    <div className="flex flex-col items-start">
                      <div className="font-medium">Full Access (Default)</div>
                      <div className="text-xs text-muted-foreground">
                        All permissions except delete & export
                      </div>
                    </div>
                  </SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      <div className="flex flex-col items-start">
                        <div className="font-medium">{role.name}</div>
                        {role.description && (
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedRole === 'full-access'
                ? 'You will have full read/write/update/approve access to all modules.'
                : 'You will only see and access modules that this role has permissions for.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            Enter Support Mode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
