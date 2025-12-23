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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2, Users, TrendingUp } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import {
  getAllOrganizationalPositions,
  createOrganizationalPosition,
  updateOrganizationalPosition,
  deleteOrganizationalPosition,
  OrganizationalPosition,
  CreateOrganizationalPositionData,
} from '@/lib/api/org/organizational-positions';
import { getAllDepartments, Department } from '@/lib/api/org/departments';
import { getAllDesignations, Designation } from '@/lib/api/org/designations';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

export default function OrganizationalPositionsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', false);
  const { hasPermission } = usePermissions();

  const [organizationalPositions, setOrganizationalPositions] = useState<OrganizationalPosition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrganizationalPosition | null>(null);
  const [deletingItem, setDeletingItem] = useState<OrganizationalPosition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateOrganizationalPositionData>({
    title: '',
    code: '',
    description: '',
    departmentId: 0,
    designationId: 0,
    reportingPositionId: undefined,
    headCount: 1,
    isActive: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [positionsData, departmentsData, designationsData] = await Promise.all([
        getAllOrganizationalPositions(orgSlug),
        getAllDepartments(orgSlug),
        getAllDesignations(orgSlug),
      ]);

      setOrganizationalPositions(positionsData);
      setDepartments(departmentsData);
      setDesignations(designationsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load data');
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
    return <PageLoader message="Loading organizational positions..." />;
  }

  const handleOpenDialog = (item?: OrganizationalPosition) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        code: item.code || '',
        description: item.description || '',
        departmentId: item.departmentId,
        designationId: item.designationId,
        reportingPositionId: item.reportingPositionId || undefined,
        headCount: item.headCount,
        isActive: item.isActive,
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        code: '',
        description: '',
        departmentId: 0,
        designationId: 0,
        reportingPositionId: undefined,
        headCount: 1,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      title: '',
      code: '',
      description: '',
      departmentId: 0,
      designationId: 0,
      reportingPositionId: undefined,
      headCount: 1,
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingItem) {
        await updateOrganizationalPosition(orgSlug, editingItem.id, formData);
        toast.success('Organizational position updated successfully');
      } else {
        await createOrganizationalPosition(orgSlug, formData);
        toast.success('Organizational position created successfully');
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
      await deleteOrganizationalPosition(orgSlug, deletingItem.id);
      toast.success('Organizational position deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organizational position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalEmployees = organizationalPositions.reduce(
    (sum, pos) => sum + (pos._count?.employees || 0),
    0
  );

  const filteredOrganizationalPositions = organizationalPositions.filter(
    (position) =>
      position.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.department?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.designation?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Organizational Positions
            </h1>
            <p className="text-gray-600 mt-1">Manage organizational structure and reporting hierarchy</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Position
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{organizationalPositions.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Active:</span>
              <span className="text-lg font-semibold text-green-600">
                {organizationalPositions.filter((p) => p.isActive).length}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Employees Assigned:</span>
              <span className="text-lg font-semibold text-blue-600">{totalEmployees}</span>
            </div>
          </div>

          {/* Right side - Search */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search positions..."
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
                    <TableHead className="font-semibold">Position Title</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Designation</TableHead>
                    <TableHead className="font-semibold">Reporting To</TableHead>
                    <TableHead className="font-semibold">Head Count</TableHead>
                    <TableHead className="font-semibold">Employees</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizationalPositions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No organizational positions found matching your search.' : 'No organizational positions found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizationalPositions.map((item) => (
                      <TableRow key={item.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.title}</span>
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
                              {item.description && (
                                <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                              )}
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
                          {item.department ? (
                            <span className="text-sm">{item.department.name}</span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.designation ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm">{item.designation.name}</span>
                              {item.designation.level !== null && (
                                <Badge variant="outline" className="font-mono text-xs">
                                  L{item.designation.level}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.reportingPosition ? (
                            <span className="text-sm">{item.reportingPosition.title}</span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{item.headCount}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">{item._count?.employees || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.isActive ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
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
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Organizational Position' : 'Add New Organizational Position'}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Update position information'
                  : 'Create a new organizational position'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Position Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., IT Manager"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department *</Label>
                  <Select
                    value={formData.departmentId ? String(formData.departmentId) : ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, departmentId: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designationId">Designation *</Label>
                  <Select
                    value={formData.designationId ? String(formData.designationId) : ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, designationId: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((desig) => (
                        <SelectItem key={desig.id} value={String(desig.id)}>
                          {desig.name}
                          {desig.level !== null && ` (L${desig.level})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., IT-MGR-01"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headCount">Head Count *</Label>
                  <Input
                    id="headCount"
                    type="number"
                    min="1"
                    value={formData.headCount}
                    onChange={(e) => setFormData({ ...formData, headCount: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportingPositionId">Reporting Position</Label>
                <Select
                  value={formData.reportingPositionId ? String(formData.reportingPositionId) : 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, reportingPositionId: value && value !== 'none' ? parseInt(value) : undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {organizationalPositions
                      .filter((pos) => !editingItem || pos.id !== editingItem.id)
                      .map((pos) => (
                        <SelectItem key={pos.id} value={String(pos.id)}>
                          {pos.title}
                          {pos.department && ` - ${pos.department.name}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this position"
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
            <DialogTitle>Delete Organizational Position</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingItem?.title}</strong>?
              {deletingItem?._count?.employees && deletingItem._count.employees > 0 ? (
                <span className="block mt-2 text-red-600">
                  This position has {deletingItem._count.employees} assigned employee(s) and cannot be deleted.
                  Please reassign them first.
                </span>
              ) : deletingItem?._count?.subordinatePositions && deletingItem._count.subordinatePositions > 0 ? (
                <span className="block mt-2 text-red-600">
                  This position has {deletingItem._count.subordinatePositions} subordinate position(s) and cannot be deleted.
                  Please reassign them first.
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
              disabled={
                isSubmitting ||
                (deletingItem?._count?.employees || 0) > 0 ||
                (deletingItem?._count?.subordinatePositions || 0) > 0
              }
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
