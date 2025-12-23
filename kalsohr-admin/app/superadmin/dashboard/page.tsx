'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { Building2, Users, CreditCard, Database, TrendingUp, Activity } from 'lucide-react';
import { getDashboardStats, DashboardStats } from '@/lib/api/dashboard';
import { toast } from 'sonner';

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    totalPlans: 0,
    platformOverview: {
      masterDataTables: 0,
      platformModules: 0,
      orgModules: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load dashboard stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Super Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-1">Welcome to KalsoHR Platform Administration</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Organizations */}
        <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Organizations</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.totalOrganizations}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.activeOrganizations} active</p>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Platform-wide</p>
          </CardContent>
        </Card>

        {/* Subscription Plans */}
        <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Subscription Plans</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.totalPlans}</p>
            <p className="text-xs text-gray-500 mt-1">Available plans</p>
          </CardContent>
        </Card>

        {/* Platform Status */}
        <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Platform Status</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">Active</p>
            <p className="text-xs text-gray-500 mt-1">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Activity monitoring coming soon</p>
            </div>
          </CardContent>
        </Card>

        {/* Platform Overview */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              Platform Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Master Data Tables</span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats?.platformOverview?.masterDataTables ?? 0} {(stats?.platformOverview?.masterDataTables ?? 0) === 1 ? 'table' : 'tables'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Platform Modules</span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats?.platformOverview?.platformModules ?? 0} {(stats?.platformOverview?.platformModules ?? 0) === 1 ? 'module' : 'modules'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Org Modules</span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats?.platformOverview?.orgModules ?? 0} {(stats?.platformOverview?.orgModules ?? 0) === 1 ? 'module' : 'modules'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </DashboardLayout>
  );
}
