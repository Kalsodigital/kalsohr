import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface Branch {
  id: number;
  organizationId: number;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  managerId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  manager?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  creator?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  updater?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  _count?: {
    employees: number;
    attendance: number;
  };
}

export interface CreateBranchData {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  managerId?: number;
  isActive?: boolean;
}

export interface UpdateBranchData extends Partial<CreateBranchData> {}

/**
 * Get all branches for an organization
 */
export const getAllBranches = async (orgSlug: string, isActive?: boolean): Promise<Branch[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/branches?${queryString}`
      : `/api/v1/${orgSlug}/masters/branches`;

    const response = await apiClient.get<ApiResponse<{ branches: Branch[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.branches;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get branch by ID
 */
export const getBranchById = async (orgSlug: string, id: number): Promise<Branch> => {
  try {
    const response = await apiClient.get<ApiResponse<{ branch: Branch }>>(
      `/api/v1/${orgSlug}/masters/branches/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.branch;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create branch
 */
export const createBranch = async (orgSlug: string, data: CreateBranchData): Promise<Branch> => {
  try {
    const response = await apiClient.post<ApiResponse<{ branch: Branch }>>(
      `/api/v1/${orgSlug}/masters/branches`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.branch;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update branch
 */
export const updateBranch = async (
  orgSlug: string,
  id: number,
  data: UpdateBranchData
): Promise<Branch> => {
  try {
    const response = await apiClient.put<ApiResponse<{ branch: Branch }>>(
      `/api/v1/${orgSlug}/masters/branches/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.branch;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete branch
 */
export const deleteBranch = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/masters/branches/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
