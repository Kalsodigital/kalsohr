'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Pencil, Trash2, MapPin, Filter, Loader2 } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import { getAllCountries, Country } from '@/lib/api/masters/countries';
import {
  getAllStates,
  createState,
  updateState,
  deleteState,
  CreateStateData,
} from '@/lib/api/masters/states';
import { State } from '@/lib/api/masters/countries';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function StatesPage() {
  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);

  const { hasPermission } = usePermissions();
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [filteredStates, setFilteredStates] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [deletingState, setDeletingState] = useState<State | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterCountryId, setFilterCountryId] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateStateData>({
    countryId: 0,
    name: '',
    code: '',
    type: 'State',
    isActive: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [countriesData, statesData] = await Promise.all([
        getAllCountries(),
        getAllStates(),
      ]);
      setCountries(countriesData);
      setStates(statesData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...states];

    if (filterCountryId !== 'all') {
      filtered = filtered.filter((s) => s.countryId === parseInt(filterCountryId));
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((s) => s.type === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.type.toLowerCase().includes(query) ||
        s.country?.name.toLowerCase().includes(query)
      );
    }

    setFilteredStates(filtered);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [states, filterCountryId, filterType, searchQuery]);

  // Don't render until permission check is complete
  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading states..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (state?: State) => {
    if (state) {
      setEditingState(state);
      setFormData({
        countryId: state.countryId,
        name: state.name,
        code: state.code,
        type: state.type,
        isActive: state.isActive,
      });
    } else {
      setEditingState(null);
      setFormData({
        countryId: countries[0]?.id || 0,
        name: '',
        code: '',
        type: 'State',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingState(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingState) {
        const { countryId, ...updateData } = formData;
        await updateState(editingState.id, updateData);
        toast.success('State updated successfully');
      } else {
        await createState(formData);
        toast.success('State created successfully');
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
    if (!deletingState) return;

    setIsSubmitting(true);
    try {
      await deleteState(deletingState.id);
      toast.success('State deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingState(null);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete state');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              States / Union Territories
            </h1>
            <p className="text-gray-600 mt-1">Manage states and union territories</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add State
          </Button>
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredStates.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">States:</span>
              <span className="text-lg font-semibold text-blue-600">
                {filteredStates.filter((s) => s.type === 'State').length}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">UTs:</span>
              <span className="text-lg font-semibold text-purple-600">
                {filteredStates.filter((s) => s.type === 'Union Territory').length}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Active:</span>
              <span className="text-lg font-semibold text-green-600">
                {filteredStates.filter((s) => s.isActive).length}
              </span>
            </div>
          </div>

          {/* Right side - Search */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search states..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 h-9"
            />
          </div>
        </div>

        {/* Filters */}
        <Card className="border border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={filterCountryId} onValueChange={setFilterCountryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={String(country.id)}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="State">States</SelectItem>
                    <SelectItem value="Union Territory">Union Territories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold">State/UT Name</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Country</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No states found matching your search.' : 'No states found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStates.map((state) => (
                      <TableRow key={state.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="font-medium">{state.name}</span>
                            <AuditHoverIcon
                            moduleCode="master_data"
                              createdAt={state.createdAt}
                              createdBy={state.createdBy}
                              creator={state.creator}
                              updatedAt={state.updatedAt}
                              updatedBy={state.updatedBy}
                              updater={state.updater}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {state.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {state.type === 'State' ? (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                              State
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                              Union Territory
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{state.country?.name}</span>
                        </TableCell>
                        <TableCell>
                          {state.isActive ? (
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
                              onClick={() => handleOpenDialog(state)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingState(state);
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
                {editingState ? 'Edit State/UT' : 'Add New State/UT'}
              </DialogTitle>
              <DialogDescription>
                {editingState
                  ? 'Update state/UT information'
                  : 'Add a new state or union territory'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryId">Country *</Label>
                  <Select
                    value={String(formData.countryId)}
                    onValueChange={(value) => setFormData({ ...formData, countryId: parseInt(value) })}
                    disabled={!!editingState}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={String(country.id)}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">State/UT Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Maharashtra"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., MH"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="State">State</SelectItem>
                      <SelectItem value="Union Territory">Union Territory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                {isSubmitting ? 'Saving...' : editingState ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete State/UT</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingState?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingState(null);
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
    </DashboardLayout>
  );
}
