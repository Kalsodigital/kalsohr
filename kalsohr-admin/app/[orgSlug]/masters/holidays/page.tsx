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
import { Plus, Pencil, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import {
  getAllHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  Holiday,
  CreateHolidayData,
} from '@/lib/api/org/holidays';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { format, isAfter, isBefore } from 'date-fns';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

const HOLIDAY_TYPES = ['National', 'Religious', 'Company', 'Regional'] as const;

const TYPE_COLORS: Record<string, string> = {
  National: 'bg-blue-100 text-blue-700 border-blue-200',
  Religious: 'bg-purple-100 text-purple-700 border-purple-200',
  Company: 'bg-green-100 text-green-700 border-green-200',
  Regional: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function HolidaysPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', false);
  const { hasPermission } = usePermissions();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Holiday | null>(null);
  const [deletingItem, setDeletingItem] = useState<Holiday | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateHolidayData>({
    date: '',
    name: '',
    description: '',
    type: 'National',
    isOptional: false,
    isActive: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getAllHolidays(orgSlug, { year: selectedYear });
      setHolidays(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load holidays');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess && !permissionLoading) {
      loadData();
    }
  }, [hasAccess, permissionLoading, orgSlug, selectedYear]);

  // Don't render until permission check is complete
  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return <PageLoader message="Loading holidays..." />;
  }

  const handleOpenDialog = (item?: Holiday) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        date: format(new Date(item.date), 'yyyy-MM-dd'),
        name: item.name,
        description: item.description || '',
        type: item.type,
        isOptional: item.isOptional,
        isActive: item.isActive,
      });
    } else {
      setEditingItem(null);
      setFormData({
        date: '',
        name: '',
        description: '',
        type: 'National',
        isOptional: false,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      date: '',
      name: '',
      description: '',
      type: 'National',
      isOptional: false,
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingItem) {
        await updateHoliday(orgSlug, editingItem.id, formData);
        toast.success('Holiday updated successfully');
      } else {
        await createHoliday(orgSlug, formData);
        toast.success('Holiday created successfully');
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
      await deleteHoliday(orgSlug, deletingItem.id);
      toast.success('Holiday deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const upcomingHolidays = holidays.filter((h) => isAfter(new Date(h.date), today));
  const optionalHolidays = holidays.filter((h) => h.isOptional);

  const filteredHolidays = holidays.filter(
    (holiday) =>
      holiday.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holiday.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holiday.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Holidays
            </h1>
            <p className="text-gray-600 mt-1">Manage organization holiday calendar</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Holiday
          </Button>
        </div>

        {/* Year Selector */}
        <Card className="border border-gray-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedYear(selectedYear - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-lg font-semibold w-20 text-center">{selectedYear}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedYear(selectedYear + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedYear === currentYear - 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedYear(currentYear - 1)}
                >
                  {currentYear - 1}
                </Button>
                <Button
                  variant={selectedYear === currentYear ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedYear(currentYear)}
                >
                  {currentYear}
                </Button>
                <Button
                  variant={selectedYear === currentYear + 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedYear(currentYear + 1)}
                >
                  {currentYear + 1}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total ({selectedYear}):</span>
              <span className="text-lg font-semibold text-gray-900">{holidays.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Upcoming:</span>
              <span className="text-lg font-semibold text-purple-600">{upcomingHolidays.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Optional:</span>
              <span className="text-lg font-semibold text-blue-600">{optionalHolidays.length}</span>
            </div>
          </div>

          {/* Right side - Search */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search holidays..."
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
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Holiday Name</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Optional</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHolidays.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No holidays found matching your search.' : `No holidays found for ${selectedYear}. Create one to get started.`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHolidays.map((item) => {
                      const holidayDate = new Date(item.date);
                      const isPast = isBefore(holidayDate, today);
                      const isUpcoming = isAfter(holidayDate, today);

                      return (
                        <TableRow
                          key={item.id}
                          className={`border-b border-gray-100 ${
                            isPast ? 'opacity-60' : isUpcoming ? 'bg-purple-50' : ''
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <span className="font-medium">{format(holidayDate, 'dd MMM yyyy')}</span>
                                <p className="text-xs text-gray-500">{format(holidayDate, 'EEEE')}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            <Badge className={TYPE_COLORS[item.type] || 'bg-gray-100 text-gray-700'}>
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.isOptional ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-200">
                                Optional
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
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
                      );
                    })
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
              <DialogTitle>{editingItem ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update holiday information' : 'Add a new holiday to the calendar'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Holiday Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Republic Day"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOLIDAY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
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
                  placeholder="Brief description of this holiday"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isOptional" className="text-sm font-medium">
                  Optional Holiday
                </Label>
                <Switch
                  id="isOptional"
                  checked={formData.isOptional}
                  onCheckedChange={(checked) => setFormData({ ...formData, isOptional: checked })}
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
            <DialogTitle>Delete Holiday</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingItem?.name}</strong> on{' '}
              <strong>{deletingItem && format(new Date(deletingItem.date), 'dd MMM yyyy')}</strong>?
              <span className="block mt-2">This action cannot be undone.</span>
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
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
