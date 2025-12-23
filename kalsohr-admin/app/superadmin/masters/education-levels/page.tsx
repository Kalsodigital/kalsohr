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
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import {
  getAllEducationLevels,
  createEducationLevel,
  updateEducationLevel,
  deleteEducationLevel,
  EducationLevel,
  CreateEducationLevelData,
} from '@/lib/api/masters/education-levels';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function EducationLevelsPage() {
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);
  const { hasPermission } = usePermissions();

  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEducationLevel, setEditingEducationLevel] = useState<EducationLevel | null>(null);
  const [deletingEducationLevel, setDeletingEducationLevel] = useState<EducationLevel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateEducationLevelData>({
    name: '',
    code: '',
    level: 0,
    isActive: true,
    displayOrder: 0,
  });

  const loadEducationLevels = async () => {
    try {
      setIsLoading(true);
      const data = await getAllEducationLevels();
      setEducationLevels(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load education levels');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEducationLevels();
  }, []);

  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading education levels..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (educationLevel?: EducationLevel) => {
    if (educationLevel) {
      setEditingEducationLevel(educationLevel);
      setFormData({
        name: educationLevel.name,
        code: educationLevel.code,
        level: educationLevel.level,
        isActive: educationLevel.isActive,
        displayOrder: educationLevel.displayOrder,
      });
    } else {
      setEditingEducationLevel(null);
      setFormData({
        name: '',
        code: '',
        level: 0,
        isActive: true,
        displayOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEducationLevel(null);
    setFormData({
      name: '',
      code: '',
      level: 0,
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingEducationLevel) {
        await updateEducationLevel(editingEducationLevel.id, formData);
        toast.success('Blood group updated successfully');
      } else {
        await createEducationLevel(formData);
        toast.success('Blood group created successfully');
      }
      handleCloseDialog();
      loadEducationLevels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEducationLevel) return;

    setIsSubmitting(true);
    try {
      await deleteEducationLevel(deletingEducationLevel.id);
      toast.success('Blood group deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingEducationLevel(null);
      loadEducationLevels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete education level');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEducationLevels = educationLevels.filter((el) => {
    const query = searchQuery.toLowerCase();
    return (
      el.name.toLowerCase().includes(query) ||
      el.code.toLowerCase().includes(query)
    );
  });

  const activeCount = filteredEducationLevels.filter((el) => el.isActive).length;
  const inactiveCount = filteredEducationLevels.filter((el) => !el.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Education Levels
            </h1>
            <p className="text-gray-600 mt-1">Manage education level master data</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Education Level
          </Button>
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredEducationLevels.length}</span>
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
              placeholder="Search education levels..."
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
                    <TableHead className="font-semibold">Education Level</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Level</TableHead>
                    <TableHead className="font-semibold">Display Order</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEducationLevels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No education levels found matching your search.' : 'No education levels found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEducationLevels.map((educationLevel) => (
                      <TableRow key={educationLevel.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <GraduationCap className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="font-medium">{educationLevel.name}</span>
                            <AuditHoverIcon
                            moduleCode="master_data"
                              createdAt={educationLevel.createdAt}
                              createdBy={educationLevel.createdBy}
                              creator={educationLevel.creator}
                              updatedAt={educationLevel.updatedAt}
                              updatedBy={educationLevel.updatedBy}
                              updater={educationLevel.updater}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {educationLevel.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            {educationLevel.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{educationLevel.displayOrder}</TableCell>
                        <TableCell>
                          {educationLevel.isActive ? (
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
                              onClick={() => handleOpenDialog(educationLevel)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingEducationLevel(educationLevel);
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
                  {editingEducationLevel ? 'Edit Education Level' : 'Add New Education Level'}
                </DialogTitle>
                <DialogDescription>
                  {editingEducationLevel
                    ? 'Update education level information'
                    : 'Add a new education level'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Bachelor's Degree"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., BACHELOR"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level * (0-10, 0=Lowest)</Label>
                  <Input
                    id="level"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
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
                  {isSubmitting ? 'Saving...' : editingEducationLevel ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Education Level</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingEducationLevel?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingEducationLevel(null);
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
