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
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, Briefcase } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import {
  getAllJobPositions,
  createJobPosition,
  updateJobPosition,
  deleteJobPosition,
  JobPosition,
  CreateJobPositionData,
} from '@/lib/api/org/job-positions';
import { getAllDepartments, Department } from '@/lib/api/org/departments';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { format } from 'date-fns';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

const PRIORITIES = ['High', 'Medium', 'Low'] as const;
const STATUSES = ['Open', 'On Hold', 'Filled', 'Closed'] as const;

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-green-100 text-green-700 border-green-200',
  'On Hold': 'bg-orange-100 text-orange-700 border-orange-200',
  Filled: 'bg-blue-100 text-blue-700 border-blue-200',
  Closed: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function JobPositionsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', false);
  const { hasPermission } = usePermissions();

  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JobPosition | null>(null);
  const [deletingItem, setDeletingItem] = useState<JobPosition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateJobPositionData>({
    title: '',
    code: '',
    description: '',
    departmentId: undefined,
    requiredSkills: '',
    requiredQualifications: '',
    minExperience: 0,
    maxExperience: undefined,
    vacancies: 1,
    priority: 'Medium',
    status: 'Open',
    postedDate: format(new Date(), 'yyyy-MM-dd'),
    closingDate: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);

      const filters: any = {};
      if (filterStatus && filterStatus !== 'all') filters.status = filterStatus;
      if (filterPriority && filterPriority !== 'all') filters.priority = filterPriority;
      if (filterDepartment && filterDepartment !== 'all') filters.departmentId = parseInt(filterDepartment);

      const [positionsData, departmentsData] = await Promise.all([
        getAllJobPositions(orgSlug, filters),
        getAllDepartments(orgSlug),
      ]);

      setJobPositions(positionsData);
      setDepartments(departmentsData);
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
  }, [hasAccess, permissionLoading, orgSlug, filterStatus, filterPriority, filterDepartment]);

  // Don't render until permission check is complete
  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return <PageLoader message="Loading job positions..." />;
  }

  const handleOpenDialog = (item?: JobPosition) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        code: item.code || '',
        description: item.description || '',
        departmentId: item.departmentId || undefined,
        requiredSkills: item.requiredSkills || '',
        requiredQualifications: item.requiredQualifications || '',
        minExperience: item.minExperience,
        maxExperience: item.maxExperience || undefined,
        vacancies: item.vacancies,
        priority: item.priority,
        status: item.status,
        postedDate: item.postedDate ? format(new Date(item.postedDate), 'yyyy-MM-dd') : '',
        closingDate: item.closingDate ? format(new Date(item.closingDate), 'yyyy-MM-dd') : '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        code: '',
        description: '',
        departmentId: undefined,
        requiredSkills: '',
        requiredQualifications: '',
        minExperience: 0,
        maxExperience: undefined,
        vacancies: 1,
        priority: 'Medium',
        status: 'Open',
        postedDate: format(new Date(), 'yyyy-MM-dd'),
        closingDate: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingItem) {
        await updateJobPosition(orgSlug, editingItem.id, formData);
        toast.success('Job position updated successfully');
      } else {
        await createJobPosition(orgSlug, formData);
        toast.success('Job position created successfully');
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
      await deleteJobPosition(orgSlug, deletingItem.id);
      toast.success('Job position deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete job position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPositions = jobPositions.filter((jp) => jp.status === 'Open');
  const totalVacancies = jobPositions.reduce((sum, jp) => sum + jp.vacancies, 0);
  const totalApplications = jobPositions.reduce((sum, jp) => sum + (jp._count?.applications || 0), 0);

  const filteredJobPositions = jobPositions.filter(
    (position) =>
      position.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.department?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Recruitment Job Positions
            </h1>
            <p className="text-gray-600 mt-1">Manage job openings and hiring pipeline</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Job Position
          </Button>
        </div>

        {/* Filters */}
        <Card className="border border-gray-200">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{jobPositions.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Open:</span>
              <span className="text-lg font-semibold text-green-600">{openPositions.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Vacancies:</span>
              <span className="text-lg font-semibold text-blue-600">{totalVacancies}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Applications:</span>
              <span className="text-lg font-semibold text-purple-600">{totalApplications}</span>
            </div>
          </div>

          {/* Right side - Search */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search job positions..."
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
                    <TableHead className="font-semibold">Job Title</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Experience</TableHead>
                    <TableHead className="font-semibold">Vacancies</TableHead>
                    <TableHead className="font-semibold">Applications</TableHead>
                    <TableHead className="font-semibold">Priority</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobPositions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No job positions found matching your search.' : 'No job positions found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobPositions.map((item) => (
                      <TableRow key={item.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-green-600" />
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
                          <span className="text-sm">
                            {item.minExperience}
                            {item.maxExperience ? `-${item.maxExperience}` : '+'} yrs
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{item.vacancies}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{item._count?.applications || 0}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={PRIORITY_COLORS[item.priority]}>
                            {item.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[item.status]}>
                            {item.status}
                          </Badge>
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Job Position' : 'Add New Job Position'}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update job position details' : 'Create a new job opening'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Senior Software Engineer"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., SSE-001"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departmentId">Department</Label>
                    <Select
                      value={formData.departmentId ? String(formData.departmentId) : ''}
                      onValueChange={(value) =>
                        setFormData({ ...formData, departmentId: value ? parseInt(value) : undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={String(dept.id)}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Job description and responsibilities"
                    rows={3}
                  />
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700">Requirements</h3>
                <div className="space-y-2">
                  <Label htmlFor="requiredSkills">Required Skills</Label>
                  <Textarea
                    id="requiredSkills"
                    value={formData.requiredSkills}
                    onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                    placeholder="e.g., React, Node.js, TypeScript"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requiredQualifications">Required Qualifications</Label>
                  <Textarea
                    id="requiredQualifications"
                    value={formData.requiredQualifications}
                    onChange={(e) => setFormData({ ...formData, requiredQualifications: e.target.value })}
                    placeholder="e.g., Bachelor's in Computer Science"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minExperience">Min Experience (years)</Label>
                    <Input
                      id="minExperience"
                      type="number"
                      min="0"
                      value={formData.minExperience}
                      onChange={(e) => setFormData({ ...formData, minExperience: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxExperience">Max Experience (years)</Label>
                    <Input
                      id="maxExperience"
                      type="number"
                      min="0"
                      value={formData.maxExperience || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, maxExperience: e.target.value ? parseInt(e.target.value) : undefined })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Vacancy Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700">Vacancy Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vacancies">Vacancies *</Label>
                    <Input
                      id="vacancies"
                      type="number"
                      min="1"
                      value={formData.vacancies}
                      onChange={(e) => setFormData({ ...formData, vacancies: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postedDate">Posted Date</Label>
                    <Input
                      id="postedDate"
                      type="date"
                      value={formData.postedDate}
                      onChange={(e) => setFormData({ ...formData, postedDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closingDate">Closing Date</Label>
                    <Input
                      id="closingDate"
                      type="date"
                      value={formData.closingDate}
                      onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                    />
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
            <DialogTitle>Delete Job Position</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingItem?.title}</strong>?
              {deletingItem?._count?.applications && deletingItem._count.applications > 0 ? (
                <span className="block mt-2 text-red-600">
                  This position has {deletingItem._count.applications} application(s) and cannot be deleted.
                  Consider marking it as 'Closed' instead.
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
              disabled={isSubmitting || (deletingItem?._count?.applications || 0) > 0}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
