import apiClient, { handleApiError } from './client';
import { ApiResponse } from '../types/api';

export interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalPlans: number;
  platformOverview: {
    masterDataTables: number;
    platformModules: number;
    orgModules: number;
  };
}

/**
 * Get Super Admin Dashboard Statistics
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await apiClient.get<ApiResponse<DashboardStats>>(
      '/api/v1/superadmin/dashboard/stats'
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch dashboard stats');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
