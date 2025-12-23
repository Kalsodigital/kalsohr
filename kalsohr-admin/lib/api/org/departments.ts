import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface Department {
  id: number;
  organizationId: number;
  name: string;
  code: string | null;
  description: string | null;
  headEmployeeId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  headEmployee?: {
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
    jobPositions: number;
  };
}

export interface CreateDepartmentData {
  name: string;
  code?: string;
  description?: string;
  headEmployeeId?: number;
  isActive?: boolean;
}

export interface UpdateDepartmentData extends Partial<CreateDepartmentData> {}

/**
 * Get all departments for an organization
 */
export const getAllDepartments = async (orgSlug: string, isActive?: boolean): Promise<Department[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/departments?${queryString}`
      : `/api/v1/${orgSlug}/masters/departments`;

    const response = await apiClient.get<ApiResponse<{ departments: Department[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.departments;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get department by ID
 */
export const getDepartmentById = async (orgSlug: string, id: number): Promise<Department> => {
  try {
    const response = await apiClient.get<ApiResponse<{ department: Department }>>(
      `/api/v1/${orgSlug}/masters/departments/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.department;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create department
 */
export const createDepartment = async (orgSlug: string, data: CreateDepartmentData): Promise<Department> => {
  try {
    const response = await apiClient.post<ApiResponse<{ department: Department }>>(
      `/api/v1/${orgSlug}/masters/departments`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.department;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update department
 */
export const updateDepartment = async (
  orgSlug: string,
  id: number,
  data: UpdateDepartmentData
): Promise<Department> => {
  try {
    const response = await apiClient.put<ApiResponse<{ department: Department }>>(
      `/api/v1/${orgSlug}/masters/departments/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.department;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete department
 */
export const deleteDepartment = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/masters/departments/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
