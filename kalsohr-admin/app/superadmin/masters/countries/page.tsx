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
import { Plus, Pencil, Trash2, Globe, Phone } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import {
  getAllCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  Country,
  CreateCountryData,
} from '@/lib/api/masters/countries';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function CountriesPage() {
  // Check module access
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);

  const { hasPermission } = usePermissions();
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [deletingCountry, setDeletingCountry] = useState<Country | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateCountryData>({
    name: '',
    code: '',
    iso2: '',
    phoneCode: '',
    isActive: true,
  });

  const loadCountries = async () => {
    try {
      setIsLoading(true);
      const data = await getAllCountries();
      setCountries(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load countries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCountries();
  }, []);

  // Don't render until permission check is complete
  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading countries..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (country?: Country) => {
    if (country) {
      setEditingCountry(country);
      setFormData({
        name: country.name,
        code: country.code,
        iso2: country.iso2,
        phoneCode: country.phoneCode,
        isActive: country.isActive,
      });
    } else {
      setEditingCountry(null);
      setFormData({
        name: '',
        code: '',
        iso2: '',
        phoneCode: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCountry(null);
    setFormData({
      name: '',
      code: '',
      iso2: '',
      phoneCode: '',
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCountry) {
        await updateCountry(editingCountry.id, formData);
        toast.success('Country updated successfully');
      } else {
        await createCountry(formData);
        toast.success('Country created successfully');
      }
      handleCloseDialog();
      loadCountries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCountry) return;

    setIsSubmitting(true);
    try {
      await deleteCountry(deletingCountry.id);
      toast.success('Country deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingCountry(null);
      loadCountries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete country');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCountries = countries.filter((country) => {
    const query = searchQuery.toLowerCase();
    return (
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.iso2.toLowerCase().includes(query) ||
      country.phoneCode.toLowerCase().includes(query)
    );
  });

  const activeCount = filteredCountries.filter((c) => c.isActive).length;
  const inactiveCount = filteredCountries.filter((c) => !c.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Countries
            </h1>
            <p className="text-gray-600 mt-1">Manage countries and phone codes</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!hasPermission('master_data', 'canWrite')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Country
          </Button>
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredCountries.length}</span>
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
              placeholder="Search countries..."
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
                    <TableHead className="font-semibold">Country Name</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">ISO2</TableHead>
                    <TableHead className="font-semibold">Phone Code</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCountries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No countries found matching your search.' : 'No countries found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCountries.map((country) => (
                      <TableRow key={country.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Globe className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium">{country.name}</span>
                            <AuditHoverIcon
                            moduleCode="master_data"
                              createdAt={country.createdAt}
                              createdBy={country.createdBy}
                              creator={country.creator}
                              updatedAt={country.updatedAt}
                              updatedBy={country.updatedBy}
                              updater={country.updater}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {country.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {country.iso2}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="font-mono text-sm">{country.phoneCode}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {country.isActive ? (
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
                              onClick={() => handleOpenDialog(country)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingCountry(country);
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
                {editingCountry ? 'Edit Country' : 'Add New Country'}
              </DialogTitle>
              <DialogDescription>
                {editingCountry
                  ? 'Update country information'
                  : 'Add a new country to the system'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Country Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., India"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneCode">Phone Code *</Label>
                  <Input
                    id="phoneCode"
                    value={formData.phoneCode}
                    onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                    placeholder="e.g., +91"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code (ISO3) *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., IND"
                    maxLength={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iso2">ISO2 Code *</Label>
                  <Input
                    id="iso2"
                    value={formData.iso2}
                    onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                    placeholder="e.g., IN"
                    maxLength={2}
                    required
                  />
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
                {isSubmitting ? 'Saving...' : editingCountry ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Country</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingCountry?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingCountry(null);
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
