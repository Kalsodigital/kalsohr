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
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import {
  getAllBusinessCategories,
  createBusinessCategory,
  updateBusinessCategory,
  deleteBusinessCategory,
  BusinessCategory,
  CreateBusinessCategoryData,
} from '@/lib/api/masters/business-categories';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function BusinessCategoriesPage() {
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);
  const { hasPermission } = usePermissions();

  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingBusinessCategory, setEditingBusinessCategory] = useState<BusinessCategory | null>(null);
  const [deletingBusinessCategory, setDeletingBusinessCategory] = useState<BusinessCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateBusinessCategoryData>({
    name: '',
    code: '',
    description: '',
    isActive: true,
    displayOrder: 0,
  });

  const loadBusinessCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getAllBusinessCategories();
      setBusinessCategories(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load business categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessCategories();
  }, []);

  if (permissionLoading || !hasAccess) {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading business categories..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (businessCategory?: BusinessCategory) => {
    if (businessCategory) {
      setEditingBusinessCategory(businessCategory);
      setFormData({
        name: businessCategory.name,
        code: businessCategory.code,
        description: businessCategory.description || '',
        isActive: businessCategory.isActive,
        displayOrder: businessCategory.displayOrder,
      });
    } else {
      setEditingBusinessCategory(null);
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
    setEditingBusinessCategory(null);
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
      if (editingBusinessCategory) {
        await updateBusinessCategory(editingBusinessCategory.id, formData);
        toast.success('Business category updated successfully');
      } else {
        await createBusinessCategory(formData);
        toast.success('Business category created successfully');
      }
      handleCloseDialog();
      loadBusinessCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBusinessCategory) return;

    setIsSubmitting(true);
    try {
      await deleteBusinessCategory(deletingBusinessCategory.id);
      toast.success('Business category deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingBusinessCategory(null);
      loadBusinessCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete business category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBusinessCategories = businessCategories.filter((bc) => {
    const query = searchQuery.toLowerCase();
    return (
      bc.name.toLowerCase().includes(query) ||
      bc.code.toLowerCase().includes(query) ||
      (bc.description && bc.description.toLowerCase().includes(query))
    );
  });

  const activeCount = filteredBusinessCategories.filter((bc) => bc.isActive).length;
  const inactiveCount = filteredBusinessCategories.filter((bc) => !bc.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Business Categories
            </h1>
            <p className="text-gray-600 mt-1">Manage business category master data (SME, Enterprise, Startup, etc.)</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Business Category
          </Button>
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredBusinessCategories.length}</span>
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
              placeholder="Search business categories..."
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
                    <TableHead className="font-semibold">Business Category</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Display Order</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinessCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No business categories found matching your search.' : 'No business categories found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBusinessCategories.map((businessCategory) => (
                      <TableRow key={businessCategory.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">{businessCategory.name}</span>
                            <AuditHoverIcon
                            moduleCode="master_data"
                              createdAt={businessCategory.createdAt}
                              createdBy={businessCategory.createdBy}
                              creator={businessCategory.creator}
                              updatedAt={businessCategory.updatedAt}
                              updatedBy={businessCategory.updatedBy}
                              updater={businessCategory.updater}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {businessCategory.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                          {businessCategory.description || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{businessCategory.displayOrder}</TableCell>
                        <TableCell>
                          {businessCategory.isActive ? (
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
                              onClick={() => handleOpenDialog(businessCategory)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingBusinessCategory(businessCategory);
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
                  {editingBusinessCategory ? 'Edit Business Category' : 'Add New Business Category'}
                </DialogTitle>
                <DialogDescription>
                  {editingBusinessCategory
                    ? 'Update business category information'
                    : 'Add a new business category (e.g., SME, Enterprise, Startup, etc.)'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Small & Medium Enterprise"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., SME"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this business category"
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
                  {isSubmitting ? 'Saving...' : editingBusinessCategory ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Business Category</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingBusinessCategory?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingBusinessCategory(null);
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
