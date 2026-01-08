'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Helper function to get full image URL
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getEmployeeById, deleteEmployee } from '@/lib/api/org/employees';
import { Employee, EMPLOYEE_STATUS } from '@/lib/types/employee';
import { EditEmployeeDialog } from '../edit-employee-dialog';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Users,
  FileText,
  CreditCard,
  Activity,
  Edit,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const employeeId = parseInt(params.id as string);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const data = await getEmployeeById(orgSlug, employeeId);
      setEmployee(data);
    } catch (error) {
      console.error('Failed to load employee:', error);
      toast.error('Failed to load employee details');
      router.push(`/${orgSlug}/employees`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case EMPLOYEE_STATUS.ACTIVE:
        return 'bg-green-100 text-green-800';
      case EMPLOYEE_STATUS.ON_LEAVE:
        return 'bg-yellow-100 text-yellow-800';
      case EMPLOYEE_STATUS.TERMINATED:
        return 'bg-red-100 text-red-800';
      case EMPLOYEE_STATUS.RESIGNED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy');
  };

  const getInitials = () => {
    if (!employee) return 'U';
    return `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleExport = () => {
    if (!employee) return;

    try {
      setIsExporting(true);

      // Create CSV content for single employee
      const headers = [
        'Employee Code',
        'First Name',
        'Middle Name',
        'Last Name',
        'Email',
        'Phone',
        'Alternate Phone',
        'Date of Birth',
        'Gender',
        'Marital Status',
        'Blood Group',
        'Department',
        'Designation',
        'Branch',
        'Employment Type',
        'Date of Joining',
        'Date of Leaving',
        'Status',
        'Salary',
        'Current Address',
        'Permanent Address',
        'City',
        'State',
        'Country',
        'Postal Code',
        'Father Name',
        'Mother Name',
        'Emergency Contact',
        'Emergency Phone',
        'Aadhar Number',
        'PAN Number',
        'Bank Account',
        'IFSC Code',
        'UAN Number',
      ];

      const row = [
        employee.employeeCode,
        employee.firstName,
        employee.middleName || '',
        employee.lastName || '',
        employee.email || '',
        employee.phone || '',
        employee.alternatePhone || '',
        employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '',
        employee.genderMaster?.name || '',
        employee.maritalStatusMaster?.name || '',
        employee.bloodGroupMaster?.name || '',
        employee.department?.name || '',
        employee.designation?.name || '',
        employee.branch?.name || '',
        employee.employmentType?.name || '',
        formatDate(employee.dateOfJoining),
        employee.dateOfLeaving ? formatDate(employee.dateOfLeaving) : '',
        employee.status,
        employee.salary?.toString() || '',
        employee.currentAddress?.replace(/\n/g, ' ') || '',
        employee.permanentAddress?.replace(/\n/g, ' ') || '',
        employee.cityMaster?.name || '',
        employee.cityMaster?.state?.name || '',
        employee.cityMaster?.state?.country?.name || '',
        employee.postalCode || '',
        employee.fatherName || '',
        employee.motherName || '',
        employee.emergencyContactName || '',
        employee.emergencyContactPhone || '',
        employee.aadharNumber || '',
        employee.panNumber || '',
        employee.bankAccountNumber || '',
        employee.bankIfscCode || '',
        employee.uanNumber || '',
      ];

      // Escape fields that contain commas or quotes
      const escapeCsvField = (field: string) => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      const csvContent = [
        headers.map(escapeCsvField).join(','),
        row.map(escapeCsvField).join(','),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const fileName = `employee_${employee.employeeCode}_${employee.firstName}_${employee.lastName}_${new Date().toISOString().split('T')[0]}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Employee data exported successfully');
    } catch (error) {
      console.error('Failed to export employee:', error);
      toast.error('Failed to export employee data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!employee) return;

    try {
      setIsDeleting(true);
      await deleteEmployee(orgSlug, employee.id);
      toast.success('Employee deleted successfully');
      setIsDeleteDialogOpen(false);
      router.push(`/${orgSlug}/employees`);
    } catch (error) {
      console.error('Failed to delete employee:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading employee details...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/${orgSlug}/employees`)}
          className="hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employees
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {employee.firstName} {employee.middleName} {employee.lastName}
            </h1>
            <p className="text-gray-600 mt-2">
              {employee.designation?.name} • {employee.employeeCode}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              disabled={isExporting}
              className="border-green-200 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button
              onClick={() => setIsEditDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-start gap-8">
              <div className="relative">
                <Avatar
                  className="h-32 w-32 border-4 border-white shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => employee.profilePicture && setIsImageModalOpen(true)}
                >
                  <AvatarImage src={getImageUrl(employee.profilePicture)} alt={employee.firstName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white text-3xl font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white shadow-md ${
                  employee.isActive ? 'bg-green-500' : 'bg-gray-400'
                }`} title={employee.isActive ? 'Active' : 'Inactive'} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-4 mb-5">
                  <Badge className={`${getStatusColor(employee.status)} px-3 py-1 text-sm font-semibold`}>
                    {employee.status}
                  </Badge>
                  {employee.department && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{employee.department.name}</span>
                    </div>
                  )}
                  {employee.branch && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{employee.branch.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-8 text-sm">
                  {employee.email && (
                    <div className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors">
                      <div className="bg-green-50 p-2 rounded-lg">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="font-medium">{employee.phone}</span>
                    </div>
                  )}
                  {employee.dateOfJoining && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="bg-purple-50 p-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Joined</span>
                        <span className="font-medium">{formatDate(employee.dateOfJoining)}</span>
                      </div>
                    </div>
                  )}
                  {(employee.status === EMPLOYEE_STATUS.TERMINATED || employee.status === EMPLOYEE_STATUS.RESIGNED) && employee.dateOfLeaving && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="bg-red-50 p-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Left</span>
                        <span className="font-medium">{formatDate(employee.dateOfLeaving)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Tabs Section */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="family">Family</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Quick Info Card */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  Quick Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start gap-4 group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors">
                  <div className="bg-purple-50 p-2.5 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Department</p>
                    <p className="font-semibold text-gray-900">{employee.department?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors">
                  <div className="bg-blue-50 p-2.5 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Designation</p>
                    <p className="font-semibold text-gray-900">{employee.designation?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors">
                  <div className="bg-green-50 p-2.5 rounded-lg group-hover:bg-green-100 transition-colors">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Branch</p>
                    <p className="font-semibold text-gray-900">{employee.branch?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors">
                  <div className="bg-orange-50 p-2.5 rounded-lg group-hover:bg-orange-100 transition-colors">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Joining Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(employee.dateOfJoining)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-medium">Total Attendance</p>
                    <div className="bg-blue-100 p-1.5 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 mb-1">{employee._count?.attendance || 0}</p>
                  <p className="text-xs text-gray-500">Days present this month</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-medium">Leave Balance</p>
                    <div className="bg-green-100 p-1.5 rounded-lg">
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-green-600 mb-1">{employee._count?.leaveRequests || 0}</p>
                  <p className="text-xs text-gray-500">Leave requests</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Email</p>
                  </div>
                  <p className="font-medium text-gray-900 break-all">{employee.email || '-'}</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Phone</p>
                  </div>
                  <p className="font-medium text-gray-900">{employee.phone || '-'}</p>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-purple-600" />
                    <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Alternate Phone</p>
                  </div>
                  <p className="font-medium text-gray-900">{employee.alternatePhone || '-'}</p>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-orange-600" />
                    <p className="text-xs text-orange-700 font-semibold uppercase tracking-wide">Emergency Contact</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {employee.emergencyContactName || '-'}
                    {employee.emergencyContactPhone && (
                      <span className="block text-sm text-gray-600 mt-1">{employee.emergencyContactPhone}</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">Activity will appear here once available</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment Tab */}
        <TabsContent value="employment" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Employment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Employee Code</p>
                  <p className="font-semibold text-gray-900">{employee.employeeCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Department</p>
                  <p className="font-semibold text-gray-900">{employee.department?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Designation</p>
                  <p className="font-semibold text-gray-900">{employee.designation?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Branch</p>
                  <p className="font-semibold text-gray-900">{employee.branch?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Employment Type</p>
                  <p className="font-semibold text-gray-900">{employee.employmentType?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <Badge className={getStatusColor(employee.status)}>{employee.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date of Joining</p>
                  <p className="font-semibold text-gray-900">{formatDate(employee.dateOfJoining)}</p>
                </div>
                {(employee.status === EMPLOYEE_STATUS.TERMINATED ||
                  employee.status === EMPLOYEE_STATUS.RESIGNED ||
                  employee.dateOfLeaving) && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Date of Leaving</p>
                    <p className="font-semibold text-gray-900">{formatDate(employee.dateOfLeaving)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Salary</p>
                  <p className="font-semibold text-gray-900">
                    {employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Status</p>
                  <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                  <p className="font-medium">{formatDate(employee.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Gender</p>
                  <p className="font-medium">{employee.genderMaster?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Marital Status</p>
                  <p className="font-medium">{employee.maritalStatusMaster?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Blood Group</p>
                  <p className="font-medium">{employee.bloodGroupMaster?.name || employee.bloodGroup || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Religion</p>
                  <p className="font-medium">{employee.religionMaster?.name || employee.religion || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Education Level</p>
                  <p className="font-medium">{employee.educationLevelMaster?.name || employee.educationLevel || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Degrees/Certifications</p>
                  <p className="font-medium whitespace-pre-wrap">{employee.degrees || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Current Address</p>
                  <p className="font-medium whitespace-pre-wrap">{employee.currentAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Permanent Address</p>
                  <p className="font-medium whitespace-pre-wrap">{employee.permanentAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">City</p>
                  <p className="font-medium">{employee.cityMaster?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">State</p>
                  <p className="font-medium">{employee.cityMaster?.state?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Country</p>
                  <p className="font-medium">{employee.cityMaster?.state?.country?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Postal Code</p>
                  <p className="font-medium">{employee.postalCode || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Father's Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Name</p>
                  <p className="font-medium">{employee.fatherName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Occupation</p>
                  <p className="font-medium">{employee.fatherOccupation || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Contact Number</p>
                  <p className="font-medium">{employee.fatherContact || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <p className="font-medium">{employee.fatherStatus || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mother's Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Name</p>
                  <p className="font-medium">{employee.motherName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Occupation</p>
                  <p className="font-medium">{employee.motherOccupation || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Contact Number</p>
                  <p className="font-medium">{employee.motherContact || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <p className="font-medium">{employee.motherStatus || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Name</p>
                  <p className="font-medium">{employee.emergencyContactName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Contact Number</p>
                  <p className="font-medium">{employee.emergencyContactPhone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Family Address</p>
                  <p className="font-medium whitespace-pre-wrap">{employee.familyAddress || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Siblings</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.siblings && employee.siblings.length > 0 ? (
                <div className="space-y-4">
                  {employee.siblings.map((sibling, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className="font-medium">{sibling.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Gender</p>
                          <p className="font-medium">{sibling.gender || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Occupation</p>
                          <p className="font-medium">{sibling.occupation || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Date of Birth</p>
                          <p className="font-medium">{formatDate(sibling.dateOfBirth)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Marital Status</p>
                          <p className="font-medium">{sibling.maritalStatus || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Contact</p>
                          <p className="font-medium">{sibling.contact || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No siblings information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Aadhar Number</p>
                  <p className="font-medium font-mono">{employee.aadharNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">PAN Number</p>
                  <p className="font-medium font-mono">{employee.panNumber || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Profile Picture</p>
                  {employee.profilePicture ? (
                    <a
                      href={getImageUrl(employee.profilePicture)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Picture
                    </a>
                  ) : (
                    <p className="font-medium">N/A</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">ID Proof</p>
                  {employee.idProof ? (
                    <a
                      href={employee.idProof.startsWith('http') ? employee.idProof : `http://localhost:3000${employee.idProof}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Document
                    </a>
                  ) : (
                    <p className="font-medium">N/A</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banking Tab */}
        <TabsContent value="banking" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Banking Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Bank Account Number</p>
                  <p className="font-medium font-mono">{employee.bankAccountNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Bank IFSC Code</p>
                  <p className="font-medium font-mono">{employee.bankIfscCode || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">UAN Number</p>
                  <p className="font-medium font-mono">{employee.uanNumber || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">No attendance records available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">No leave balance information available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">No recent leave requests</p>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <EditEmployeeDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        orgSlug={orgSlug}
        employee={employee}
        onSuccess={loadEmployee}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>
                {employee?.firstName} {employee?.lastName}
              </strong>
              ?
              <span className="block mt-2 text-red-600 font-medium">
                This action cannot be undone. All employee data, including attendance records, leave history, and documents will be permanently removed.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Employee'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Profile Picture - {employee?.firstName} {employee?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {employee?.profilePicture ? (
              <img
                src={getImageUrl(employee.profilePicture)}
                alt={`${employee.firstName} ${employee.lastName}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <p className="text-gray-500">No profile picture available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
