import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface Religion {
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

export interface CreateReligionData {
  name: string;
  code: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateReligionData extends Partial<CreateReligionData> {}

/**
 * Get all religions (for superadmin)
 */
export const getAllReligions = async (isActive?: boolean): Promise<Religion[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ religions: Religion[] }>>(
      `/api/v1/superadmin/masters/religions?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.religions;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get all religions (for organization)
 */
export const getAllReligionsForOrg = async (orgSlug: string, isActive?: boolean): Promise<Religion[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ religions: Religion[] }>>(
      `/api/v1/${orgSlug}/masters/religions?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.religions;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get religion by ID
 */
export const getReligionById = async (id: number): Promise<Religion> => {
  try {
    const response = await apiClient.get<Religion>(
      `/api/v1/superadmin/masters/religions/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create religion
 */
export const createReligion = async (data: CreateReligionData): Promise<Religion> => {
  try {
    const response = await apiClient.post<Religion>(
      '/api/v1/superadmin/masters/religions',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update religion
 */
export const updateReligion = async (id: number, data: UpdateReligionData): Promise<Religion> => {
  try {
    const response = await apiClient.put<Religion>(
      `/api/v1/superadmin/masters/religions/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete religion
 */
export const deleteReligion = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/religions/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
