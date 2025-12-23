'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Shield,
  Download,
  Coffee,
  AlertTriangle,
  Eye,
  Filter,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllEmployees, deleteEmployee, exportEmployeesCSV, downloadEmployeesCSV, bulkUpdateEmployeeStatus } from '@/lib/api/org/employees';
import { getAllDepartments } from '@/lib/api/org/departments';
import { getAllDesignations } from '@/lib/api/org/designations';
import { getAllBranches } from '@/lib/api/org/branches';
import { getAllEmploymentTypes } from '@/lib/api/org/employment-types';
import { Employee, EmployeeFilters, EMPLOYEE_STATUS } from '@/lib/types/employee';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

// Helper function to get full image URL
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};
import { CreateEmployeeDialog } from './create-employee-dialog';
import { EditEmployeeDialog } from './edit-employee-dialog';

export default function EmployeesPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const { hasPermission, isLoading: permissionLoading } = useOrgPermissions();

  // Permission checks
  const canRead = hasPermission('employees', 'canRead');
  const canWrite = hasPermission('employees', 'canWrite');
  const canUpdate = hasPermission('employees', 'canUpdate');
  const canDelete = hasPermission('employees', 'canDelete');
  const canExport = hasPermission('employees', 'canExport');

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EmployeeFilters>({
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Filter options
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Show/hide filters
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setFilters(prev => ({ ...prev, page: 1 })); // Reset to page 1 when searching
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load employees
  useEffect(() => {
    const loadEmployees = async () => {
      if (!canRead) return;

      try {
        setLoading(true);
        const combinedFilters: EmployeeFilters = {
          ...filters,
          search: searchQuery || undefined,
        };

        const data = await getAllEmployees(orgSlug, combinedFilters);
        setEmployees(data.employees);
        setPagination(data.pagination);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    if (!permissionLoading && canRead) {
      loadEmployees();
    }
  }, [filters, searchQuery, refreshTrigger, orgSlug, permissionLoading, canRead]);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!canRead) return;

      try {
        const [depts, desigs, branchesList, empTypes] = await Promise.all([
          getAllDepartments(orgSlug, true),
          getAllDesignations(orgSlug, true),
          getAllBranches(orgSlug, true),
          getAllEmploymentTypes(orgSlug, true),
        ]);

        setDepartments(depts);
        setDesignations(desigs);
        setBranches(branchesList);
        setEmploymentTypes(empTypes);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    if (!permissionLoading && canRead) {
      loadFilterOptions();
    }
  }, [orgSlug, permissionLoading, canRead]);

  // Don't render until permission check is complete
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">You don't have permission to view employees.</p>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!deletingEmployee) return;

    try {
      await deleteEmployee(orgSlug, deletingEmployee.id);
      toast.success('Employee deleted successfully');
      setDeletingEmployee(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee');
    }
  };

  const handleExportCSV = async () => {
    if (!canExport) {
      toast.error('You do not have permission to export employees');
      return;
    }

    try {
      setExporting(true);
      const combinedFilters: EmployeeFilters = {
        ...filters,
        search: searchQuery || undefined,
      };
      const blob = await exportEmployeesCSV(orgSlug, combinedFilters);
      const filename = `employees_${orgSlug}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadEmployeesCSV(blob, filename);
      toast.success('Employees exported successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export employees');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case EMPLOYEE_STATUS.ACTIVE:
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            Active
          </Badge>
        );
      case EMPLOYEE_STATUS.ON_LEAVE:
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            On Leave
          </Badge>
        );
      case EMPLOYEE_STATUS.TERMINATED:
        return (
          <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">
            Terminated
          </Badge>
        );
      case EMPLOYEE_STATUS.RESIGNED:
        return (
          <Badge variant="default" className="bg-gray-100 text-gray-700 border-gray-200">
            Resigned
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (employee: Employee) => {
    const first = employee.firstName?.[0] || '';
    const last = employee.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'E';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 10 });
    setSearchInput('');
    setSearchQuery('');
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map((e) => e.id));
    }
  };

  const handleSelectEmployee = (employeeId: number) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter((id) => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    try {
      await bulkUpdateEmployeeStatus(orgSlug, {
        employeeIds: selectedEmployees,
        status,
      });
      toast.success(`Updated ${selectedEmployees.length} employee(s) status to ${status}`);
      setSelectedEmployees([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleClearSelection = () => {
    setSelectedEmployees([]);
  };

  // Calculate stats
  const stats = {
    total: pagination.total,
    active: employees.filter((e) => e.status === EMPLOYEE_STATUS.ACTIVE && e.isActive).length,
    onLeave: employees.filter((e) => e.status === EMPLOYEE_STATUS.ON_LEAVE).length,
    terminated: employees.filter(
      (e) => e.status === EMPLOYEE_STATUS.TERMINATED || e.status === EMPLOYEE_STATUS.RESIGNED
    ).length,
  };

  const hasActiveFilters =
    filters.departmentId ||
    filters.designationId ||
    filters.branchId ||
    filters.employmentTypeId ||
    filters.status ||
    filters.isActive !== undefined ||
    searchQuery;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Employees
          </h1>
          <p className="text-gray-600 mt-2">Manage employees in your organization</p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button
              onClick={handleExportCSV}
              variant="outline"
              disabled={exporting}
              className="border-green-200 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
          {canWrite && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Stats + Search/Filters */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-lg font-semibold text-gray-900">{stats.total}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Active:</span>
                <span className="text-lg font-semibold text-green-600">{stats.active}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Coffee className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">On Leave:</span>
                <span className="text-lg font-semibold text-yellow-600">{stats.onLeave}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <UserX className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Terminated/Resigned:</span>
                <span className="text-lg font-semibold text-red-600">{stats.terminated}</span>
              </div>
            </div>
          </div>

          {/* Right side - Search and Filters */}
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 border-gray-200"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="text-gray-600 h-9">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-600 h-9"
            >
              <Filter className="w-4 h-4 mr-1" />
              {showFilters ? 'Hide' : 'Filters'}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="border border-gray-200">
            <CardContent className="pt-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Department Filter */}
                <div className="space-y-2">
                  <Label htmlFor="department-filter" className="text-sm font-medium">
                    Department
                  </Label>
                  <Select
                    value={filters.departmentId ? String(filters.departmentId) : 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        departmentId: value === 'all' ? undefined : parseInt(value),
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger id="department-filter" className="h-10 w-full">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Designation Filter */}
                <div className="space-y-2">
                  <Label htmlFor="designation-filter" className="text-sm font-medium">
                    Designation
                  </Label>
                  <Select
                    value={filters.designationId ? String(filters.designationId) : 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        designationId: value === 'all' ? undefined : parseInt(value),
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger id="designation-filter" className="h-10 w-full">
                      <SelectValue placeholder="All Designations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Designations</SelectItem>
                      {designations.map((desig) => (
                        <SelectItem key={desig.id} value={String(desig.id)}>
                          {desig.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Branch Filter */}
                <div className="space-y-2">
                  <Label htmlFor="branch-filter" className="text-sm font-medium">
                    Branch
                  </Label>
                  <Select
                    value={filters.branchId ? String(filters.branchId) : 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        branchId: value === 'all' ? undefined : parseInt(value),
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger id="branch-filter" className="h-10 w-full">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Employment Type Filter */}
                <div className="space-y-2">
                  <Label htmlFor="employment-type-filter" className="text-sm font-medium">
                    Employment Type
                  </Label>
                  <Select
                    value={filters.employmentTypeId ? String(filters.employmentTypeId) : 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        employmentTypeId: value === 'all' ? undefined : parseInt(value),
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger id="employment-type-filter" className="h-10 w-full">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {employmentTypes.map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="status-filter" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        status: value === 'all' ? undefined : value,
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger id="status-filter" className="h-10 w-full">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value={EMPLOYEE_STATUS.ACTIVE}>Active</SelectItem>
                      <SelectItem value={EMPLOYEE_STATUS.ON_LEAVE}>On Leave</SelectItem>
                      <SelectItem value={EMPLOYEE_STATUS.TERMINATED}>Terminated</SelectItem>
                      <SelectItem value={EMPLOYEE_STATUS.RESIGNED}>Resigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Filter */}
                <div className="space-y-2">
                  <Label htmlFor="active-filter" className="text-sm font-medium">
                    Active Status
                  </Label>
                  <Select
                    value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        isActive: value === 'all' ? undefined : value === 'active',
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger id="active-filter" className="h-10 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table Card */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">Loading employees...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No employees found</p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Bulk Actions Bar */}
                {selectedEmployees.length > 0 && (
                  <div className="px-6 py-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedEmployees.length} employee(s) selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                        className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {canExport && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await exportEmployeesCSV(orgSlug, {
                                ...filters,
                                employeeIds: selectedEmployees,
                              });
                              toast.success(`Exported ${selectedEmployees.length} employee(s)`);
                            } catch (error) {
                              toast.error('Failed to export employees');
                            }
                          }}
                          className="bg-white"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Selected
                        </Button>
                      )}
                      {canUpdate && (
                        <div className="relative">
                          <select
                            className="h-9 px-3 pr-8 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleBulkStatusUpdate(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Update Status
                            </option>
                            <option value="Active">Active</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Terminated">Terminated</option>
                            <option value="Resigned">Resigned</option>
                          </select>
                        </div>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${selectedEmployees.length} employee(s)?`)) {
                              Promise.all(
                                selectedEmployees.map((id) => deleteEmployee(orgSlug, id))
                              )
                                .then(() => {
                                  toast.success(`Deleted ${selectedEmployees.length} employee(s)`);
                                  setSelectedEmployees([]);
                                  setRefreshTrigger((prev) => prev + 1);
                                })
                                .catch((error) => {
                                  toast.error('Failed to delete some employees');
                                });
                            }
                          }}
                          className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSelectAll}
                            className="h-8 w-8"
                          >
                            {selectedEmployees.length === employees.length ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">Employee</TableHead>
                        <TableHead className="font-semibold">Department</TableHead>
                        <TableHead className="font-semibold">Designation</TableHead>
                        <TableHead className="font-semibold">Branch</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Joining Date</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSelectEmployee(employee.id)}
                              className="h-8 w-8"
                            >
                              {selectedEmployees.includes(employee.id) ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={getImageUrl(employee.profilePicture)} alt={employee.firstName} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold text-sm">
                                  {getInitials(employee)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {employee.firstName} {employee.middleName} {employee.lastName}
                                  </span>
                                  <AuditHoverIcon
                                  moduleCode="employees"
                                    createdAt={employee.createdAt}
                                    createdBy={employee.createdBy}
                                    creator={employee.creator}
                                    updatedAt={employee.updatedAt}
                                    updatedBy={employee.updatedBy}
                                    updater={employee.updater}
                                  />
                                </div>
                                <div className="text-sm text-gray-500">{employee.employeeCode}</div>
                                {employee.email && (
                                  <div className="text-sm text-gray-500">{employee.email}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {employee.department ? (
                              <div>
                                <div className="font-medium text-gray-900">{employee.department.name}</div>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {employee.department.code}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {employee.designation ? (
                              <div>
                                <div className="font-medium text-gray-900">{employee.designation.name}</div>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {employee.designation.code}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {employee.branch ? (
                              <div className="font-medium text-gray-900">{employee.branch.name}</div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(employee.status)}</TableCell>
                          <TableCell>{formatDate(employee.dateOfJoining)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/${orgSlug}/employees/${employee.id}`)}
                                className="h-8 w-8 text-gray-600 hover:text-blue-600"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {canUpdate && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingEmployee(employee)}
                                  className="h-8 w-8 text-gray-600 hover:text-blue-600"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingEmployee(employee)}
                                  className="h-8 w-8 text-gray-600 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
                      employees
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(
                            (page) =>
                              page === 1 ||
                              page === pagination.totalPages ||
                              Math.abs(page - pagination.page) <= 1
                          )
                          .map((page, index, array) => (
                            <React.Fragment key={`page-${page}`}>
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <span className="px-2 text-gray-400">
                                  ...
                                </span>
                              )}
                              <Button
                                variant={pagination.page === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilters({ ...filters, page })}
                                className={
                                  pagination.page === page
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600'
                                }
                              >
                                {page}
                              </Button>
                            </React.Fragment>
                          ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingEmployee} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Employee
            </DialogTitle>
            <DialogDescription className="pt-4">
              Are you sure you want to delete{' '}
              <strong>
                {deletingEmployee?.firstName} {deletingEmployee?.lastName}
              </strong>
              ? This action cannot be undone and will remove all associated data including attendance,
              leave records, and documents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingEmployee(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Employee Dialog */}
      <CreateEmployeeDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        orgSlug={orgSlug}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Edit Employee Dialog */}
      <EditEmployeeDialog
        open={!!editingEmployee}
        onOpenChange={(open) => !open && setEditingEmployee(null)}
        orgSlug={orgSlug}
        employee={editingEmployee}
        onSuccess={() => {
          setEditingEmployee(null);
          setRefreshTrigger((prev) => prev + 1);
        }}
      />
    </div>
  );
}
