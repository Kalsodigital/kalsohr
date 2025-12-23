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
import { Plus, Pencil, Trash2, Building2, Filter } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import { getAllCountries, Country} from '@/lib/api/masters/countries';
import { getAllStates } from '@/lib/api/masters/states';
import { State } from '@/lib/api/masters/countries';
import {
  getAllCities,
  createCity,
  updateCity,
  deleteCity,
  City,
  CreateCityData,
} from '@/lib/api/masters/cities';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function CitiesPage() {
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);
  const { hasPermission } = usePermissions();

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [deletingCity, setDeletingCity] = useState<City | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterCountryId, setFilterCountryId] = useState<string>('all');
  const [filterStateId, setFilterStateId] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateCityData>({
    stateId: 0,
    name: '',
    code: '',
    type: 'City',
    isActive: true,
    displayOrder: 0,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [countriesData, statesData, citiesData] = await Promise.all([
        getAllCountries(),
        getAllStates(),
        getAllCities(),
      ]);
      setCountries(countriesData);
      setStates(statesData);
      setCities(citiesData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cities];

    if (filterCountryId !== 'all') {
      filtered = filtered.filter((c) => c.state?.country.id === parseInt(filterCountryId));
    }

    if (filterStateId !== 'all') {
      filtered = filtered.filter((c) => c.stateId === parseInt(filterStateId));
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((c) => c.type === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        c.type.toLowerCase().includes(query) ||
        c.state?.name.toLowerCase().includes(query) ||
        c.state?.country.name.toLowerCase().includes(query)
      );
    }

    setFilteredCities(filtered);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [cities, filterCountryId, filterStateId, filterType, searchQuery]);

  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading cities..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (city?: City) => {
    if (city) {
      setEditingCity(city);
      setFormData({
        stateId: city.stateId,
        name: city.name,
        code: city.code,
        type: city.type,
        isActive: city.isActive,
        displayOrder: city.displayOrder,
      });
    } else {
      setEditingCity(null);
      setFormData({
        stateId: 0,
        name: '',
        code: '',
        type: 'City',
        isActive: true,
        displayOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCity(null);
    setFormData({
      stateId: 0,
      name: '',
      code: '',
      type: 'City',
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCity) {
        await updateCity(editingCity.id, formData);
        toast.success('City updated successfully');
      } else {
        await createCity(formData);
        toast.success('City created successfully');
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
    if (!deletingCity) return;

    setIsSubmitting(true);
    try {
      await deleteCity(deletingCity.id);
      toast.success('City deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingCity(null);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete city');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = filteredCities.filter((c) => c.isActive).length;
  const inactiveCount = filteredCities.filter((c) => !c.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Cities
            </h1>
            <p className="text-gray-600 mt-1">Manage city master data</p>
          </div>
          {hasPermission('master_data', 'canWrite') && (
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add City
            </Button>
          )}
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredCities.length}</span>
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
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 h-9"
            />
          </div>
        </div>

        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterCountry" className="text-sm font-medium text-gray-700">
                  Filter by Country
                </Label>
                <Select value={filterCountryId} onValueChange={setFilterCountryId}>
                  <SelectTrigger id="filterCountry" className="bg-white">
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
                <Label htmlFor="filterState" className="text-sm font-medium text-gray-700">
                  Filter by State
                </Label>
                <Select value={filterStateId} onValueChange={setFilterStateId}>
                  <SelectTrigger id="filterState" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {states.map((state) => (
                      <SelectItem key={state.id} value={String(state.id)}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterType" className="text-sm font-medium text-gray-700">
                  Filter by Type
                </Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger id="filterType" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="City">City</SelectItem>
                    <SelectItem value="District">District</SelectItem>
                    <SelectItem value="Town">Town</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {filteredCities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No cities found matching your search.' : (filterCountryId !== 'all' || filterStateId !== 'all' || filterType !== 'all' ? 'No cities found. Try adjusting the filters.' : 'No cities found. Create one to get started.')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b border-gray-200">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">State</TableHead>
                      <TableHead className="font-semibold">Country</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredCities.map((city) => (
                    <TableRow key={city.id} className="border-b border-gray-100">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{city.name}</span>
                          <AuditHoverIcon
                            moduleCode="master_data"
                            createdAt={city.createdAt}
                            createdBy={city.createdBy}
                            creator={city.creator}
                            updatedAt={city.updatedAt}
                            updatedBy={city.updatedBy}
                            updater={city.updater}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{city.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">{city.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{city.state?.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{city.state?.country?.name}</TableCell>
                      <TableCell>
                        {city.isActive ? (
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
                            onClick={() => handleOpenDialog(city)}
                            disabled={!hasPermission('master_data', 'canUpdate')}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeletingCity(city);
                              setIsDeleteDialogOpen(true);
                            }}
                            disabled={!hasPermission('master_data', 'canDelete')}
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCity ? 'Edit City' : 'Add New City'}
              </DialogTitle>
              <DialogDescription>
                {editingCity
                  ? 'Update city information'
                  : 'Add a new city'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="stateId">State *</Label>
                  <Select
                    value={String(formData.stateId)}
                    onValueChange={(value) => setFormData({ ...formData, stateId: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={String(state.id)}>
                          {state.name} ({state.country?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Mumbai"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., MUM"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="City">City</SelectItem>
                      <SelectItem value="District">District</SelectItem>
                      <SelectItem value="Town">Town</SelectItem>
                    </SelectContent>
                  </Select>
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
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
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
                  {isSubmitting ? 'Saving...' : editingCity ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete City</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingCity?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingCity(null);
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
