'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import { Plus, Pencil, Trash2, Award, Users, TrendingUp } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import {
  getAllDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  Designation,
  CreateDesignationData,
} from '@/lib/api/org/designations';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

export default function DesignationsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', false);
  const { hasPermission } = usePermissions();

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Designation | null>(null);
  const [deletingItem, setDeletingItem] = useState<Designation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateDesignationData>({
    name: '',
    code: '',
    description: '',
    level: undefined,
    isActive: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getAllDesignations(orgSlug);
      setDesignations(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load designations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess && !permissionLoading) {
      loadData();
    }
  }, [hasAccess, permissionLoading, orgSlug]);

  // Don't render until permission check is complete
  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return (
      
        <PageLoader message="Loading designations..." />
      
    );
  }

  const handleOpenDialog = (item?: Designation) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        code: item.code || '',
        description: item.description || '',
        level: item.level ?? undefined,
        isActive: item.isActive,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        level: undefined,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      level: undefined,
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingItem) {
        await updateDesignation(orgSlug, editingItem.id, formData);
        toast.success('Designation updated successfully');
      } else {
        await createDesignation(orgSlug, formData);
        toast.success('Designation created successfully');
      }
      handleCloseDialog();
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setIsSubmitting(true);
    try {
      await deleteDesignation(orgSlug, deletingItem.id);
      toast.success('Designation deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete designation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalEmployees = designations.reduce(
    (sum, des) => sum + (des._count?.employees || 0),
    0
  );

  const hierarchyLevels = new Set(designations.map((d) => d.level).filter((l) => l !== null)).size;

  const filteredDesignations = designations.filter(
    (designation) =>
      designation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      designation.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      designation.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Designations
            </h1>
            <p className="text-gray-600 mt-1">Manage job titles and organizational hierarchy</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Designation
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{designations.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Hierarchy Levels:</span>
              <span className="text-lg font-semibold text-purple-600">{hierarchyLevels}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Employees:</span>
              <span className="text-lg font-semibold text-blue-600">{totalEmployees}</span>
            </div>
          </div>

          {/* Right side - Search */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search designations..."
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
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Level</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Employees</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDesignations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No designations found matching your search.' : 'No designations found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDesignations.map((item) => (
                      <TableRow key={item.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Award className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                <AuditHoverIcon
                                  moduleCode="master_data"
                                  createdAt={item.createdAt}
                                  createdBy={item.createdBy}
                                  creator={item.creator}
                                  updatedAt={item.updatedAt}
                                  updatedBy={item.updatedBy}
                                  updater={item.updater}
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.code ? (
                            <Badge variant="outline" className="font-mono">
                              {item.code}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.level !== null ? (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-purple-500" />
                              <Badge variant="outline" className="font-mono">
                                {item.level}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {item.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">{item._count?.employees || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.isActive ? (
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
                              onClick={() => handleOpenDialog(item)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingItem(item);
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
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Designation' : 'Add New Designation'}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Update designation information'
                  : 'Add a new designation to your organization'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Manager"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., MGR"
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Hierarchy Level (0-10)</Label>
                <Input
                  id="level"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.level ?? ''}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="e.g., 5"
                />
                <p className="text-xs text-gray-500">Higher numbers indicate senior positions (0=Entry, 10=Executive)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this designation"
                  rows={3}
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
                {isSubmitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Designation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingItem?.name}</strong>?
              {deletingItem?._count?.employees && deletingItem._count.employees > 0 ? (
                <span className="block mt-2 text-red-600">
                  This designation has {deletingItem._count.employees} employee(s) assigned and cannot be deleted.
                </span>
              ) : (
                <span className="block mt-2">This action cannot be undone.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
