'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import {
  getAllOrganizationTypes,
  createOrganizationType,
  updateOrganizationType,
  deleteOrganizationType,
  OrganizationType,
  CreateOrganizationTypeData,
} from '@/lib/api/masters/organization-types';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function OrganizationTypesPage() {
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);
  const { hasPermission } = usePermissions();

  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingOrganizationType, setEditingOrganizationType] = useState<OrganizationType | null>(null);
  const [deletingOrganizationType, setDeletingOrganizationType] = useState<OrganizationType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateOrganizationTypeData>({
    name: '',
    code: '',
    description: '',
    isActive: true,
    displayOrder: 0,
  });

  const loadOrganizationTypes = async () => {
    try {
      setIsLoading(true);
      const data = await getAllOrganizationTypes();
      setOrganizationTypes(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load organization types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizationTypes();
  }, []);

  if (permissionLoading || !hasAccess) {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading organization types..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (organizationType?: OrganizationType) => {
    if (organizationType) {
      setEditingOrganizationType(organizationType);
      setFormData({
        name: organizationType.name,
        code: organizationType.code,
        description: organizationType.description || '',
        isActive: organizationType.isActive,
        displayOrder: organizationType.displayOrder,
      });
    } else {
      setEditingOrganizationType(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        isActive: true,
        displayOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingOrganizationType(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingOrganizationType) {
        await updateOrganizationType(editingOrganizationType.id, formData);
        toast.success('Organization type updated successfully');
      } else {
        await createOrganizationType(formData);
        toast.success('Organization type created successfully');
      }
      handleCloseDialog();
      loadOrganizationTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOrganizationType) return;

    setIsSubmitting(true);
    try {
      await deleteOrganizationType(deletingOrganizationType.id);
      toast.success('Organization type deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingOrganizationType(null);
      loadOrganizationTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrganizationTypes = organizationTypes.filter((ot) => {
    const query = searchQuery.toLowerCase();
    return (
      ot.name.toLowerCase().includes(query) ||
      ot.code.toLowerCase().includes(query) ||
      (ot.description && ot.description.toLowerCase().includes(query))
    );
  });

  const activeCount = filteredOrganizationTypes.filter((ot) => ot.isActive).length;
  const inactiveCount = filteredOrganizationTypes.filter((ot) => !ot.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Organization Types
            </h1>
            <p className="text-gray-600 mt-1">Manage organization type master data (Company, LLP, etc.)</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Organization Type
          </Button>
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredOrganizationTypes.length}</span>
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
              placeholder="Search organization types..."
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
                    <TableHead className="font-semibold">Organization Type</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Display Order</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizationTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No organization types found matching your search.' : 'No organization types found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizationTypes.map((organizationType) => (
                      <TableRow key={organizationType.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{organizationType.name}</span>
                            <AuditHoverIcon
                            moduleCode="master_data"
                              createdAt={organizationType.createdAt}
                              createdBy={organizationType.createdBy}
                              creator={organizationType.creator}
                              updatedAt={organizationType.updatedAt}
                              updatedBy={organizationType.updatedBy}
                              updater={organizationType.updater}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {organizationType.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                          {organizationType.description || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{organizationType.displayOrder}</TableCell>
                        <TableCell>
                          {organizationType.isActive ? (
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
                              onClick={() => handleOpenDialog(organizationType)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingOrganizationType(organizationType);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={!hasPermission('master_data', 'canDelete')}
                            >
                              <Trash2 className="w-3 h-3 text-amber-600" />
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
                  {editingOrganizationType ? 'Edit Organization Type' : 'Add New Organization Type'}
                </DialogTitle>
                <DialogDescription>
                  {editingOrganizationType
                    ? 'Update organization type information'
                    : 'Add a new organization type (e.g., Private Limited, LLP, etc.)'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Private Limited Company"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., PVT_LTD"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this organization type"
                    rows={3}
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
                  {isSubmitting ? 'Saving...' : editingOrganizationType ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Organization Type</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingOrganizationType?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingOrganizationType(null);
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
