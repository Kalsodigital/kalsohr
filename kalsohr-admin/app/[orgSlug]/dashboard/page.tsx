'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Shield,
  CheckCircle2,
  Activity,
  Users,
  Clock,
} from 'lucide-react';

export default function OrgDashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {user?.organization?.name}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                Welcome, {user?.firstName}! - {user?.role?.name || 'User'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Role Card */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Your Role
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {user?.role?.name || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Organization role</p>
            </CardContent>
          </Card>

          {/* Organization Card */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Organization
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 truncate">
                {user?.organization?.name}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                @{user?.organization?.slug}
              </p>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Account Status
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {user?.isActive ? 'Active' : 'Inactive'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Email: {user?.emailVerified ? 'Verified ✓' : 'Not Verified'}
              </p>
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Activity
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                Active
              </p>
              <p className="text-xs text-gray-500 mt-1">Last login: Today</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Features Card */}
          <Card className="lg:col-span-2 border border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <CardTitle className="text-lg">Available Modules</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-700">Employees</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Coming soon
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-700">Attendance</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Coming soon
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-700">Leave Management</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Coming soon
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-700">Reports</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Coming soon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Email</p>
                  </div>
                  <p className="text-xs text-blue-700 truncate">{user?.email}</p>
                </div>

                {user?.phone && (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <p className="text-sm font-medium text-purple-900">Phone</p>
                    </div>
                    <p className="text-xs text-purple-700">{user.phone}</p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-green-900">Verified Account</p>
                  </div>
                  <p className="text-xs text-green-700">
                    Your account is active and verified
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
