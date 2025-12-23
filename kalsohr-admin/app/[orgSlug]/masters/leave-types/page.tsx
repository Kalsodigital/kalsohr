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
import { Plus, Pencil, Trash2, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import {
  getAllLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  LeaveType,
  CreateLeaveTypeData,
} from '@/lib/api/org/leave-types';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

export default function LeaveTypesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', false);
  const { hasPermission } = usePermissions();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveType | null>(null);
  const [deletingItem, setDeletingItem] = useState<LeaveType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateLeaveTypeData>({
    name: '',
    code: '',
    description: '',
    daysPerYear: 0,
    isPaid: true,
    requiresApproval: true,
    maxConsecutiveDays: undefined,
    isActive: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getAllLeaveTypes(orgSlug);
      setLeaveTypes(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load leave types');
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
      
        <PageLoader message="Loading leave types..." />
      
    );
  }

  const handleOpenDialog = (item?: LeaveType) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        code: item.code || '',
        description: item.description || '',
        daysPerYear: item.daysPerYear,
        isPaid: item.isPaid,
        requiresApproval: item.requiresApproval,
        maxConsecutiveDays: item.maxConsecutiveDays ?? undefined,
        isActive: item.isActive,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        daysPerYear: 0,
        isPaid: true,
        requiresApproval: true,
        maxConsecutiveDays: undefined,
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
      daysPerYear: 0,
      isPaid: true,
      requiresApproval: true,
      maxConsecutiveDays: undefined,
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingItem) {
        await updateLeaveType(orgSlug, editingItem.id, formData);
        toast.success('Leave type updated successfully');
      } else {
        await createLeaveType(orgSlug, formData);
        toast.success('Leave type created successfully');
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
      await deleteLeaveType(orgSlug, deletingItem.id);
      toast.success('Leave type deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete leave type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAnnualDays = leaveTypes.reduce((sum, lt) => sum + lt.daysPerYear, 0);
  const paidTypesCount = leaveTypes.filter((lt) => lt.isPaid).length;

  const filteredLeaveTypes = leaveTypes.filter(
    (leaveType) =>
      leaveType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leaveType.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leaveType.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Leave Types
            </h1>
            <p className="text-gray-600 mt-1">Manage leave categories and policies</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Leave Type
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total Types:</span>
              <span className="text-lg font-semibold text-gray-900">{leaveTypes.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Annual Days:</span>
              <span className="text-lg font-semibold text-blue-600">{totalAnnualDays}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Paid Types:</span>
              <span className="text-lg font-semibold text-green-600">{paidTypesCount}</span>
            </div>
          </div>

          {/* Right side - Search */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search leave types..."
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
                    <TableHead className="font-semibold">Days/Year</TableHead>
                    <TableHead className="font-semibold">Paid</TableHead>
                    <TableHead className="font-semibold">Approval</TableHead>
                    <TableHead className="font-semibold">Max Consecutive</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaveTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No leave types found matching your search.' : 'No leave types found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeaveTypes.map((item) => (
                      <TableRow key={item.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4 text-green-600" />
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
                              {item.description && (
                                <p className="text-xs text-gray-500">{item.description}</p>
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
                          <span className="font-semibold">{item.daysPerYear}</span>
                        </TableCell>
                        <TableCell>
                          {item.isPaid ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              <XCircle className="w-3 h-3 mr-1" />
                              Unpaid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.requiresApproval ? (
                            <span className="text-sm">Required</span>
                          ) : (
                            <span className="text-sm text-gray-400">Not required</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.maxConsecutiveDays ? (
                            <span className="text-sm">{item.maxConsecutiveDays} days</span>
                          ) : (
                            <span className="text-sm text-gray-400">Unlimited</span>
                          )}
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
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Leave Type' : 'Add New Leave Type'}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Update leave type configuration'
                  : 'Configure a new leave type for your organization'}
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
                    placeholder="e.g., Casual Leave"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., CL"
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this leave type"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daysPerYear">Days Per Year *</Label>
                  <Input
                    id="daysPerYear"
                    type="number"
                    min="0"
                    max="365"
                    value={formData.daysPerYear}
                    onChange={(e) => setFormData({ ...formData, daysPerYear: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxConsecutiveDays">Max Consecutive Days</Label>
                  <Input
                    id="maxConsecutiveDays"
                    type="number"
                    min="1"
                    value={formData.maxConsecutiveDays ?? ''}
                    onChange={(e) => setFormData({ ...formData, maxConsecutiveDays: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Leave blank for unlimited"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isPaid" className="text-sm font-medium">
                    Paid Leave
                  </Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="isPaid"
                      checked={formData.isPaid}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
                    />
                    <Label htmlFor="isPaid" className="ml-2 text-sm text-gray-600">
                      {formData.isPaid ? 'Yes' : 'No'}
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requiresApproval" className="text-sm font-medium">
                    Requires Approval
                  </Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="requiresApproval"
                      checked={formData.requiresApproval}
                      onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: checked })}
                    />
                    <Label htmlFor="requiresApproval" className="ml-2 text-sm text-gray-600">
                      {formData.requiresApproval ? 'Yes' : 'No'}
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isActive" className="text-sm font-medium">
                    Active Status
                  </Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive" className="ml-2 text-sm text-gray-600">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
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
            <DialogTitle>Delete Leave Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingItem?.name}</strong>?
              {deletingItem?._count?.leaveRequests && deletingItem._count.leaveRequests > 0 ? (
                <span className="block mt-2 text-red-600">
                  This leave type has {deletingItem._count.leaveRequests} leave request(s) and cannot be deleted.
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
