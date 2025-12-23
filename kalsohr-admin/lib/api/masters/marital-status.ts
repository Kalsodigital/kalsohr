import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface MaritalStatus {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  displayOrder: number;
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
}

export interface CreateMaritalStatusData {
  name: string;
  code: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateMaritalStatusData extends Partial<CreateMaritalStatusData> {}

/**
 * Get all marital statuses
 * For superadmin: pass 'superadmin' as orgSlug or omit it
 */
export const getAllMaritalStatuses = async (orgSlug?: string, isActive?: boolean): Promise<MaritalStatus[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const endpoint = orgSlug && orgSlug !== 'superadmin'
      ? `/api/v1/${orgSlug}/masters/marital-statuses?${params.toString()}`
      : `/api/v1/superadmin/masters/marital-status?${params.toString()}`;

    const response = await apiClient.get<ApiResponse<{ maritalStatuses: MaritalStatus[] }>>(endpoint);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.maritalStatuses;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get marital status by ID
 */
export const getMaritalStatusById = async (id: number): Promise<MaritalStatus> => {
  try {
    const response = await apiClient.get<MaritalStatus>(
      `/api/v1/superadmin/masters/marital-status/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create marital status
 */
export const createMaritalStatus = async (data: CreateMaritalStatusData): Promise<MaritalStatus> => {
  try {
    const response = await apiClient.post<MaritalStatus>(
      '/api/v1/superadmin/masters/marital-status',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update marital status
 */
export const updateMaritalStatus = async (id: number, data: UpdateMaritalStatusData): Promise<MaritalStatus> => {
  try {
    const response = await apiClient.put<MaritalStatus>(
      `/api/v1/superadmin/masters/marital-status/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete marital status
 */
export const deleteMaritalStatus = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/marital-status/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
