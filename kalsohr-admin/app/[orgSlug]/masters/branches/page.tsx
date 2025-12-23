'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import {
  Branch,
  CreateBranchData,
  getAllBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '@/lib/api/org/branches';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  City,
  getAllCities,
} from '@/lib/api/org/locations';

export default function BranchesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', false);
  const { hasPermission } = usePermissions();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateBranchData>({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    phone: '',
    email: '',
    managerId: undefined,
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Location data for city dropdown
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);

  // Statistics
  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.isActive).length;
  const uniqueCities = new Set(branches.filter((b) => b.city).map((b) => b.city)).size;

  useEffect(() => {
    if (hasAccess) {
      loadBranches();
    }
  }, [hasAccess, orgSlug]);

  useEffect(() => {
    const filtered = branches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.state?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBranches(filtered);
  }, [searchQuery, branches]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await getAllBranches(orgSlug);
      setBranches(data);
      setFilteredBranches(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const data = await getAllCities(orgSlug, undefined, undefined, true); // Load all active cities
      setCities(data);
    } catch (error: any) {
      console.error('Failed to load cities:', error);
    }
  };

  // Load cities when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen || isEditDialogOpen) {
      loadCities();
    }
  }, [isCreateDialogOpen, isEditDialogOpen, orgSlug]);

  // Pre-select city in edit mode
  useEffect(() => {
    if (isEditDialogOpen && cities.length > 0 && formData.city) {
      // Find the city by name to get its ID
      const city = cities.find((c) => c.name === formData.city);
      if (city) {
        setSelectedCityId(city.id);
        setSelectedStateId(city.stateId);
        setSelectedCountryId(city.state.countryId);
      }
    }
  }, [isEditDialogOpen, cities, formData.city]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Branch name is required';
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Invalid email format';
      }
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = 'Invalid phone format (only digits, spaces, +, -, (, ) allowed)';
      }
    }

    if (formData.postalCode && formData.postalCode.length > 20) {
      errors.postalCode = 'Postal code is too long (max 20 characters)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await createBranch(orgSlug, formData);
      toast.success('Branch created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      loadBranches();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create branch');
    }
  };

  const handleEdit = async () => {
    if (!selectedBranch || !validateForm()) {
      return;
    }

    try {
      await updateBranch(orgSlug, selectedBranch.id, formData);
      toast.success('Branch updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedBranch(null);
      loadBranches();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update branch');
    }
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;

    try {
      await deleteBranch(orgSlug, selectedBranch.id);
      toast.success('Branch deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedBranch(null);
      loadBranches();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete branch');
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (branch: Branch) => {
    setSelectedBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      country: branch.country || 'India',
      postalCode: branch.postalCode || '',
      phone: branch.phone || '',
      email: branch.email || '',
      managerId: branch.managerId || undefined,
      isActive: branch.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      postalCode: '',
      phone: '',
      email: '',
      managerId: undefined,
      isActive: true,
    });
    setFormErrors({});
    setSelectedCityId(null);
    setSelectedStateId(null);
    setSelectedCountryId(null);
  };

  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to access master data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Branches
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your organization's office locations and branches
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          disabled={!hasPermission('master_data', 'canWrite')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
        {/* Left side - Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="text-lg font-semibold text-gray-900">{totalBranches}</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Active:</span>
            <span className="text-lg font-semibold text-green-600">{activeBranches}</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Cities:</span>
            <span className="text-lg font-semibold text-blue-600">{uniqueCities}</span>
          </div>
        </div>

        {/* Right side - Search */}
        <div className="flex-shrink-0">
          <Input
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 h-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading branches...</div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No branches found matching your search.' : 'No branches found. Create one to get started.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">City</TableHead>
                    <TableHead className="font-semibold">State</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Manager</TableHead>
                    <TableHead className="font-semibold">Employees</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((branch) => (
                    <TableRow key={branch.id} className="border-b border-gray-100">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{branch.name}</span>
                              <AuditHoverIcon
                                  moduleCode="master_data"
                                createdAt={branch.createdAt}
                                createdBy={branch.createdBy}
                                creator={branch.creator}
                                updatedAt={branch.updatedAt}
                                updatedBy={branch.updatedBy}
                                updater={branch.updater}
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {branch.code ? (
                          <Badge variant="outline" className="font-mono">
                            {branch.code}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{branch.city || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{branch.state || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{branch.phone || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {branch.manager ? (
                          <span className="text-sm">
                            {branch.manager.firstName} {branch.manager.lastName}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">{branch._count?.employees || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {branch.isActive ? (
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
                            onClick={() => openEditDialog(branch)}
                            disabled={!hasPermission('master_data', 'canUpdate')}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(branch)}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[85vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Create New Branch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Branch Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Mumbai Office"
                    className="h-10"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-600">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-sm font-medium text-gray-700">Branch Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., MUM"
                    maxLength={10}
                    className="h-10"
                  />
                </div>
                <div></div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Address Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-3">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">Street Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Enter full street address"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedCityId?.toString() || ''}
                    onValueChange={(value) => {
                      const cityId = parseInt(value);
                      setSelectedCityId(cityId);
                      const city = cities.find((c) => c.id === cityId);
                      if (city) {
                        // Auto-populate state and country
                        setFormData({
                          ...formData,
                          city: city.name,
                          state: city.state.name,
                          country: city.state.country.name,
                        });
                        setSelectedStateId(city.stateId);
                        setSelectedCountryId(city.state.countryId);
                      }
                    }}
                  >
                    <SelectTrigger id="city" className="h-10 w-full">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id.toString()}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-sm font-medium text-gray-700">State/Province <span className="text-red-500">*</span></Label>
                  <Input
                    id="state"
                    value={formData.state}
                    disabled
                    placeholder="Auto-filled"
                    className="h-10 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></Label>
                  <Input
                    id="country"
                    value={formData.country}
                    disabled
                    placeholder="Auto-filled"
                    className="h-10 bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    placeholder="e.g., 400001"
                    maxLength={20}
                    className="h-10"
                  />
                  {formErrors.postalCode && (
                    <p className="text-xs text-red-600">{formErrors.postalCode}</p>
                  )}
                </div>
                <div></div>
                <div></div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="e.g., +91 22 1234 5678"
                    className="h-10"
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-red-600">{formErrors.phone}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="e.g., mumbai@company.com"
                    className="h-10"
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-600">{formErrors.email}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                    <Label htmlFor="isActive" className="ml-2 text-sm text-gray-600">Active</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Create Branch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[85vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Edit Branch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">
                    Branch Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Mumbai Office"
                    className="h-10"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-600">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-code" className="text-sm font-medium text-gray-700">Branch Code</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., MUM"
                    maxLength={10}
                    className="h-10"
                  />
                </div>
                <div></div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Address Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-3">
                  <Label htmlFor="edit-address" className="text-sm font-medium text-gray-700">Street Address</Label>
                  <Textarea
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Enter full street address"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-city" className="text-sm font-medium text-gray-700">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedCityId?.toString() || ''}
                    onValueChange={(value) => {
                      const cityId = parseInt(value);
                      setSelectedCityId(cityId);
                      const city = cities.find((c) => c.id === cityId);
                      if (city) {
                        // Auto-populate state and country
                        setFormData({
                          ...formData,
                          city: city.name,
                          state: city.state.name,
                          country: city.state.country.name,
                        });
                        setSelectedStateId(city.stateId);
                        setSelectedCountryId(city.state.countryId);
                      }
                    }}
                  >
                    <SelectTrigger id="edit-city" className="h-10 w-full">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id.toString()}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-state" className="text-sm font-medium text-gray-700">State/Province <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-state"
                    value={formData.state}
                    disabled
                    placeholder="Auto-filled"
                    className="h-10 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-country" className="text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-country"
                    value={formData.country}
                    disabled
                    placeholder="Auto-filled"
                    className="h-10 bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-postalCode" className="text-sm font-medium text-gray-700">Postal Code</Label>
                  <Input
                    id="edit-postalCode"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    placeholder="e.g., 400001"
                    maxLength={20}
                    className="h-10"
                  />
                  {formErrors.postalCode && (
                    <p className="text-xs text-red-600">{formErrors.postalCode}</p>
                  )}
                </div>
                <div></div>
                <div></div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="e.g., +91 22 1234 5678"
                    className="h-10"
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-red-600">{formErrors.phone}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="e.g., mumbai@company.com"
                    className="h-10"
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-600">{formErrors.email}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-isActive" className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="edit-isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                    <Label htmlFor="edit-isActive" className="ml-2 text-sm text-gray-600">Active</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Update Branch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this branch?
            </DialogDescription>
          </DialogHeader>
          {selectedBranch && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <h4 className="font-semibold text-red-900">{selectedBranch.name}</h4>
                {selectedBranch.code && (
                  <p className="text-sm text-red-700">Code: {selectedBranch.code}</p>
                )}
                {(selectedBranch._count?.employees || 0) > 0 && (
                  <p className="text-sm text-red-700 mt-2">
                    ⚠️ This branch has {selectedBranch._count?.employees} employee(s) assigned.
                  </p>
                )}
                {(selectedBranch._count?.attendance || 0) > 0 && (
                  <p className="text-sm text-red-700">
                    ⚠️ This branch has {selectedBranch._count?.attendance} attendance record(s).
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. This will permanently delete the branch.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
