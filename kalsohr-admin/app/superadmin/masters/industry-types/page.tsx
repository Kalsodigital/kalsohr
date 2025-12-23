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
import { Plus, Pencil, Trash2, Factory } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import {
  getAllIndustryTypes,
  createIndustryType,
  updateIndustryType,
  deleteIndustryType,
  IndustryType,
  CreateIndustryTypeData,
} from '@/lib/api/masters/industry-types';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function IndustryTypesPage() {
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);
  const { hasPermission } = usePermissions();

  const [industryTypes, setIndustryTypes] = useState<IndustryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingIndustryType, setEditingIndustryType] = useState<IndustryType | null>(null);
  const [deletingIndustryType, setDeletingIndustryType] = useState<IndustryType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateIndustryTypeData>({
    name: '',
    code: '',
    description: '',
    icon: '',
    isActive: true,
    displayOrder: 0,
  });

  const loadIndustryTypes = async () => {
    try {
      setIsLoading(true);
      const data = await getAllIndustryTypes();
      setIndustryTypes(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load industry types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIndustryTypes();
  }, []);

  if (permissionLoading || !hasAccess) {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading industry types..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (industryType?: IndustryType) => {
    if (industryType) {
      setEditingIndustryType(industryType);
      setFormData({
        name: industryType.name,
        code: industryType.code,
        description: industryType.description || '',
        icon: industryType.icon || '',
        isActive: industryType.isActive,
        displayOrder: industryType.displayOrder,
      });
    } else {
      setEditingIndustryType(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        icon: '',
        isActive: true,
        displayOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIndustryType(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      icon: '',
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingIndustryType) {
        await updateIndustryType(editingIndustryType.id, formData);
        toast.success('Industry type updated successfully');
      } else {
        await createIndustryType(formData);
        toast.success('Industry type created successfully');
      }
      handleCloseDialog();
      loadIndustryTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingIndustryType) return;

    setIsSubmitting(true);
    try {
      await deleteIndustryType(deletingIndustryType.id);
      toast.success('Industry type deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingIndustryType(null);
      loadIndustryTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete industry type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIndustryTypes = industryTypes.filter((it) => {
    const query = searchQuery.toLowerCase();
    return (
      it.name.toLowerCase().includes(query) ||
      it.code.toLowerCase().includes(query) ||
      (it.description && it.description.toLowerCase().includes(query))
    );
  });

  const activeCount = filteredIndustryTypes.filter((it) => it.isActive).length;
  const inactiveCount = filteredIndustryTypes.filter((it) => !it.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Industry Types
            </h1>
            <p className="text-gray-600 mt-1">Manage industry type master data (IT, Healthcare, Manufacturing, etc.)</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Industry Type
          </Button>
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredIndustryTypes.length}</span>
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
              placeholder="Search industry types..."
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
                    <TableHead className="font-semibold">Industry Type</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Icon</TableHead>
                    <TableHead className="font-semibold">Display Order</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIndustryTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No industry types found matching your search.' : 'No industry types found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIndustryTypes.map((industryType) => (
                      <TableRow key={industryType.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Factory className="w-4 h-4 text-indigo-600" />
                            <span className="font-medium">{industryType.name}</span>
                            <AuditHoverIcon
                            moduleCode="master_data"
                              createdAt={industryType.createdAt}
                              createdBy={industryType.createdBy}
                              creator={industryType.creator}
                              updatedAt={industryType.updatedAt}
                              updatedBy={industryType.updatedBy}
                              updater={industryType.updater}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {industryType.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                          {industryType.description || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {industryType.icon || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{industryType.displayOrder}</TableCell>
                        <TableCell>
                          {industryType.isActive ? (
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
                              onClick={() => handleOpenDialog(industryType)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingIndustryType(industryType);
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
                  {editingIndustryType ? 'Edit Industry Type' : 'Add New Industry Type'}
                </DialogTitle>
                <DialogDescription>
                  {editingIndustryType
                    ? 'Update industry type information'
                    : 'Add a new industry type (e.g., IT, Healthcare, Manufacturing, etc.)'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Information Technology"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., IT"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this industry type"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon (Lucide icon name)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="e.g., Monitor, Heart, Factory"
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
                  {isSubmitting ? 'Saving...' : editingIndustryType ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Industry Type</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingIndustryType?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingIndustryType(null);
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
