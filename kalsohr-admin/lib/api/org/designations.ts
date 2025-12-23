import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface Designation {
  id: number;
  organizationId: number;
  name: string;
  code: string | null;
  description: string | null;
  level: number | null;
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

export interface CreateDesignationData {
  name: string;
  code?: string;
  description?: string;
  level?: number;
  isActive?: boolean;
}

export interface UpdateDesignationData extends Partial<CreateDesignationData> {}

/**
 * Get all designations for an organization
 */
export const getAllDesignations = async (orgSlug: string, isActive?: boolean): Promise<Designation[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/designations?${queryString}`
      : `/api/v1/${orgSlug}/masters/designations`;

    const response = await apiClient.get<ApiResponse<{ designations: Designation[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.designations;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get designation by ID
 */
export const getDesignationById = async (orgSlug: string, id: number): Promise<Designation> => {
  try {
    const response = await apiClient.get<ApiResponse<{ designation: Designation }>>(
      `/api/v1/${orgSlug}/masters/designations/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.designation;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create designation
 */
export const createDesignation = async (orgSlug: string, data: CreateDesignationData): Promise<Designation> => {
  try {
    const response = await apiClient.post<ApiResponse<{ designation: Designation }>>(
      `/api/v1/${orgSlug}/masters/designations`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.designation;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update designation
 */
export const updateDesignation = async (
  orgSlug: string,
  id: number,
  data: UpdateDesignationData
): Promise<Designation> => {
  try {
    const response = await apiClient.put<ApiResponse<{ designation: Designation }>>(
      `/api/v1/${orgSlug}/masters/designations/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.designation;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete designation
 */
export const deleteDesignation = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/masters/designations/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
