import apiClient, { handleApiError } from './client';
import { ApiResponse } from '@/lib/types/api';
import {
  Organization,
  OrganizationsResponse,
  CreateOrganizationData,
  UpdateOrganizationData,
  SubscriptionPlan,
  CreateSubscriptionPlanData,
  UpdateSubscriptionPlanData,
  Module,
  OrgModule,
  PlanModule,
} from '@/lib/types/organization';

/**
 * Get all organizations (Super Admin only)
 */
export const getOrganizations = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<OrganizationsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.get<ApiResponse<OrganizationsResponse>>(
      `/api/v1/superadmin/organizations?${queryParams.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get organization by ID (Super Admin only)
 */
export const getOrganizationById = async (id: number): Promise<Organization> => {
  try {
    const response = await apiClient.get<ApiResponse<{ organization: Organization }>>(
      `/api/v1/superadmin/organizations/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.organization;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create organization (Super Admin only)
 */
export const createOrganization = async (
  data: CreateOrganizationData
): Promise<Organization> => {
  try {
    const response = await apiClient.post<ApiResponse<{ organization: Organization }>>(
      '/api/v1/superadmin/organizations',
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.organization;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update organization (Super Admin only)
 */
export const updateOrganization = async (
  id: number,
  data: UpdateOrganizationData
): Promise<Organization> => {
  try {
    const response = await apiClient.put<ApiResponse<{ organization: Organization }>>(
      `/api/v1/superadmin/organizations/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.organization;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete organization (Super Admin only)
 */
export const deleteOrganization = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/superadmin/organizations/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get all subscription plans (Super Admin only)
 */
export const getSubscriptionPlans = async (includeInactive?: boolean): Promise<SubscriptionPlan[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (includeInactive) queryParams.append('includeInactive', 'true');

    const response = await apiClient.get<ApiResponse<{ plans: SubscriptionPlan[] }>>(
      `/api/v1/superadmin/subscription-plans?${queryParams.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.plans;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get subscription plan by ID (Super Admin only)
 */
export const getSubscriptionPlanById = async (id: number): Promise<SubscriptionPlan> => {
  try {
    const response = await apiClient.get<ApiResponse<{ plan: SubscriptionPlan }>>(
      `/api/v1/superadmin/subscription-plans/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.plan;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create subscription plan (Super Admin only)
 */
export const createSubscriptionPlan = async (
  data: CreateSubscriptionPlanData
): Promise<SubscriptionPlan> => {
  try {
    const response = await apiClient.post<ApiResponse<{ plan: SubscriptionPlan }>>(
      '/api/v1/superadmin/subscription-plans',
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.plan;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update subscription plan (Super Admin only)
 */
export const updateSubscriptionPlan = async (
  id: number,
  data: UpdateSubscriptionPlanData
): Promise<SubscriptionPlan> => {
  try {
    const response = await apiClient.put<ApiResponse<{ plan: SubscriptionPlan }>>(
      `/api/v1/superadmin/subscription-plans/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.plan;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete subscription plan (Super Admin only) - Soft delete
 */
export const deleteSubscriptionPlan = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/superadmin/subscription-plans/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get all modules (Super Admin only) - Legacy
 */
export const getModules = async (): Promise<Module[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ modules: Module[] }>>(
      '/api/v1/superadmin/modules'
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.modules;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get all organization modules (Super Admin only)
 * These are the modules available for tenant organizations
 */
export const getOrgModules = async (): Promise<OrgModule[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ modules: OrgModule[] }>>(
      '/api/v1/superadmin/org-modules'
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.modules;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get modules for a specific subscription plan (Super Admin only)
 * Returns modules with isAssigned flag indicating if they're part of the plan
 */
export const getPlanModules = async (planId: number): Promise<(OrgModule & { isAssigned: boolean })[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ plan: SubscriptionPlan; modules: (OrgModule & { isAssigned: boolean })[] }>>(
      `/api/v1/superadmin/subscription-plans/${planId}/modules`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.modules;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update modules for a subscription plan (Super Admin only)
 */
export const updatePlanModules = async (
  planId: number,
  moduleIds: number[]
): Promise<PlanModule[]> => {
  try {
    const response = await apiClient.put<ApiResponse<{ planModules: PlanModule[] }>>(
      `/api/v1/superadmin/subscription-plans/${planId}/modules`,
      { moduleIds }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.planModules;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get modules for a specific organization (Super Admin only)
 * Returns organization info and modules with enabled status
 */
export const getOrganizationModules = async (orgId: number): Promise<{ organization: any; modules: any[] }> => {
  try {
    const response = await apiClient.get<ApiResponse<{ organization: any; modules: any[] }>>(
      `/api/v1/superadmin/organizations/${orgId}/modules`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update enabled modules for an organization (Super Admin only)
 * Can only disable modules from plan, cannot add new ones
 */
export const updateOrganizationModules = async (
  orgId: number,
  moduleUpdates: { orgModuleId: number; isEnabled: boolean }[]
): Promise<any[]> => {
  try {
    const response = await apiClient.put<ApiResponse<{ modules: any[] }>>(
      `/api/v1/superadmin/organizations/${orgId}/modules`,
      { modules: moduleUpdates }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.modules;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
