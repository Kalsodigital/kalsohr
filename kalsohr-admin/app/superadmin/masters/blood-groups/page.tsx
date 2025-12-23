'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Droplet } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import {
  getAllBloodGroups,
  createBloodGroup,
  updateBloodGroup,
  deleteBloodGroup,
  BloodGroup,
  CreateBloodGroupData,
} from '@/lib/api/masters/blood-groups';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function BloodGroupsPage() {
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);
  const { hasPermission } = usePermissions();

  const [bloodGroups, setBloodGroups] = useState<BloodGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingBloodGroup, setEditingBloodGroup] = useState<BloodGroup | null>(null);
  const [deletingBloodGroup, setDeletingBloodGroup] = useState<BloodGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateBloodGroupData>({
    name: '',
    code: '',
    isActive: true,
    displayOrder: 0,
  });

  const loadBloodGroups = async () => {
    try {
      setIsLoading(true);
      const data = await getAllBloodGroups();
      setBloodGroups(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load blood groups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBloodGroups();
  }, []);

  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading blood groups..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (bloodGroup?: BloodGroup) => {
    if (bloodGroup) {
      setEditingBloodGroup(bloodGroup);
      setFormData({
        name: bloodGroup.name,
        code: bloodGroup.code,
        isActive: bloodGroup.isActive,
        displayOrder: bloodGroup.displayOrder,
      });
    } else {
      setEditingBloodGroup(null);
      setFormData({
        name: '',
        code: '',
        isActive: true,
        displayOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBloodGroup(null);
    setFormData({
      name: '',
      code: '',
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingBloodGroup) {
        await updateBloodGroup(editingBloodGroup.id, formData);
        toast.success('Blood group updated successfully');
      } else {
        await createBloodGroup(formData);
        toast.success('Blood group created successfully');
      }
      handleCloseDialog();
      loadBloodGroups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBloodGroup) return;

    setIsSubmitting(true);
    try {
      await deleteBloodGroup(deletingBloodGroup.id);
      toast.success('Blood group deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingBloodGroup(null);
      loadBloodGroups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete blood group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBloodGroups = bloodGroups.filter((bg) => {
    const query = searchQuery.toLowerCase();
    return (
      bg.name.toLowerCase().includes(query) ||
      bg.code.toLowerCase().includes(query)
    );
  });

  const activeCount = filteredBloodGroups.filter((bg) => bg.isActive).length;
  const inactiveCount = filteredBloodGroups.filter((bg) => !bg.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Blood Groups
            </h1>
            <p className="text-gray-600 mt-1">Manage blood group master data</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Blood Group
          </Button>
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredBloodGroups.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Active:</span>
              <span className="text-lg font-semibold text-green-600">{activeCount}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Inactive:</span>
              <span className="text-lg font-semibold text-gray-400">{inactiveCount}</span>
            </div>
          </div>

          {/* Right side - Search */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search blood groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 h-9"
            />
          </div>
        </div>

        {/* Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold">Blood Group</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Display Order</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBloodGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No blood groups found matching your search.' : 'No blood groups found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBloodGroups.map((bloodGroup) => (
                      <TableRow key={bloodGroup.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                              <Droplet className="w-4 h-4 text-red-600" />
                            </div>
                            <span className="font-medium">{bloodGroup.name}</span>
                            <AuditHoverIcon
                            moduleCode="master_data"
                              createdAt={bloodGroup.createdAt}
                              createdBy={bloodGroup.createdBy}
                              creator={bloodGroup.creator}
                              updatedAt={bloodGroup.updatedAt}
                              updatedBy={bloodGroup.updatedBy}
                              updater={bloodGroup.updater}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {bloodGroup.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{bloodGroup.displayOrder}</TableCell>
                        <TableCell>
                          {bloodGroup.isActive ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(bloodGroup)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingBloodGroup(bloodGroup);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={!hasPermission('master_data', 'canDelete')}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingBloodGroup ? 'Edit Blood Group' : 'Add New Blood Group'}
                </DialogTitle>
                <DialogDescription>
                  {editingBloodGroup
                    ? 'Update blood group information'
                    : 'Add a new blood group'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., A Positive"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., A+"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive" className="text-sm font-medium">
                    Active Status
                  </Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {isSubmitting ? 'Saving...' : editingBloodGroup ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Blood Group</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingBloodGroup?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingBloodGroup(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
