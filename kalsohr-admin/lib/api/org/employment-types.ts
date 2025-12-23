import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface EmploymentType {
  id: number;
  organizationId: number;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;
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
  };
}

export interface CreateEmploymentTypeData {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateEmploymentTypeData extends Partial<CreateEmploymentTypeData> {}

/**
 * Get all employment types for an organization
 */
export const getAllEmploymentTypes = async (orgSlug: string, isActive?: boolean): Promise<EmploymentType[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/employment-types?${queryString}`
      : `/api/v1/${orgSlug}/masters/employment-types`;

    const response = await apiClient.get<ApiResponse<{ employmentTypes: EmploymentType[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.employmentTypes;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get employment type by ID
 */
export const getEmploymentTypeById = async (orgSlug: string, id: number): Promise<EmploymentType> => {
  try {
    const response = await apiClient.get<ApiResponse<{ employmentType: EmploymentType }>>(
      `/api/v1/${orgSlug}/masters/employment-types/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.employmentType;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create employment type
 */
export const createEmploymentType = async (orgSlug: string, data: CreateEmploymentTypeData): Promise<EmploymentType> => {
  try {
    const response = await apiClient.post<ApiResponse<{ employmentType: EmploymentType }>>(
      `/api/v1/${orgSlug}/masters/employment-types`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.employmentType;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update employment type
 */
export const updateEmploymentType = async (
  orgSlug: string,
  id: number,
  data: UpdateEmploymentTypeData
): Promise<EmploymentType> => {
  try {
    const response = await apiClient.put<ApiResponse<{ employmentType: EmploymentType }>>(
      `/api/v1/${orgSlug}/masters/employment-types/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.employmentType;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete employment type
 */
export const deleteEmploymentType = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/masters/employment-types/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
