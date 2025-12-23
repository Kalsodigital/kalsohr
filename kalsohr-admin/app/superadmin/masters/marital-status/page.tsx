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
import { Plus, Pencil, Trash2, Heart } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import {
  getAllMaritalStatuses,
  createMaritalStatus,
  updateMaritalStatus,
  deleteMaritalStatus,
  MaritalStatus,
  CreateMaritalStatusData,
} from '@/lib/api/masters/marital-status';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function MaritalStatusesPage() {
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);
  const { hasPermission } = usePermissions();

  const [maritalStatuses, setMaritalStatuss] = useState<MaritalStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingMaritalStatus, setEditingMaritalStatus] = useState<MaritalStatus | null>(null);
  const [deletingMaritalStatus, setDeletingMaritalStatus] = useState<MaritalStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateMaritalStatusData>({
    name: '',
    code: '',
    isActive: true,
    displayOrder: 0,
  });

  const loadMaritalStatuses = async () => {
    try {
      setIsLoading(true);
      const data = await getAllMaritalStatuses();
      setMaritalStatuss(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load marital statuss');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaritalStatuses();
  }, []);

  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading marital statuses..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (maritalStatus?: MaritalStatus) => {
    if (maritalStatus) {
      setEditingMaritalStatus(maritalStatus);
      setFormData({
        name: maritalStatus.name,
        code: maritalStatus.code,
        isActive: maritalStatus.isActive,
        displayOrder: maritalStatus.displayOrder,
      });
    } else {
      setEditingMaritalStatus(null);
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
    setEditingMaritalStatus(null);
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
      if (editingMaritalStatus) {
        await updateMaritalStatus(editingMaritalStatus.id, formData);
        toast.success('Blood group updated successfully');
      } else {
        await createMaritalStatus(formData);
        toast.success('Blood group created successfully');
      }
      handleCloseDialog();
      loadMaritalStatuses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMaritalStatus) return;

    setIsSubmitting(true);
    try {
      await deleteMaritalStatus(deletingMaritalStatus.id);
      toast.success('Blood group deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingMaritalStatus(null);
      loadMaritalStatuses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete marital status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMaritalStatuses = maritalStatuses.filter((ms) => {
    const query = searchQuery.toLowerCase();
    return (
      ms.name.toLowerCase().includes(query) ||
      ms.code.toLowerCase().includes(query)
    );
  });

  const activeCount = filteredMaritalStatuses.filter((ms) => ms.isActive).length;
  const inactiveCount = filteredMaritalStatuses.filter((ms) => !ms.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Marital Statuss
            </h1>
            <p className="text-gray-600 mt-1">Manage marital status master data</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Marital Status
          </Button>
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredMaritalStatuses.length}</span>
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
              placeholder="Search marital statuses..."
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
                    <TableHead className="font-semibold">Marital Status</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Display Order</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaritalStatuses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No marital statuses found matching your search.' : 'No marital statuses found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaritalStatuses.map((maritalStatus) => (
                      <TableRow key={maritalStatus.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-pink-100 flex items-center justify-center">
                              <Heart className="w-4 h-4 text-pink-600" />
                            </div>
                            <span className="font-medium">{maritalStatus.name}</span>
                            <AuditHoverIcon
                            moduleCode="master_data"
                              createdAt={maritalStatus.createdAt}
                              createdBy={maritalStatus.createdBy}
                              creator={maritalStatus.creator}
                              updatedAt={maritalStatus.updatedAt}
                              updatedBy={maritalStatus.updatedBy}
                              updater={maritalStatus.updater}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {maritalStatus.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{maritalStatus.displayOrder}</TableCell>
                        <TableCell>
                          {maritalStatus.isActive ? (
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
                              onClick={() => handleOpenDialog(maritalStatus)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingMaritalStatus(maritalStatus);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={!hasPermission('master_data', 'canDelete')}
                            >
                              <Trash2 className="w-3 h-3 text-pink-600" />
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
                  {editingMaritalStatus ? 'Edit Marital Status' : 'Add New Marital Status'}
                </DialogTitle>
                <DialogDescription>
                  {editingMaritalStatus
                    ? 'Update marital status information'
                    : 'Add a new marital status'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Single"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., SINGLE"
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
                  {isSubmitting ? 'Saving...' : editingMaritalStatus ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Marital Status</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingMaritalStatus?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingMaritalStatus(null);
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
