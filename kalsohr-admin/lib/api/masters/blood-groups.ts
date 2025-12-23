import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface BloodGroup {
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

export interface CreateBloodGroupData {
  name: string;
  code: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateBloodGroupData extends Partial<CreateBloodGroupData> {}

/**
 * Get all blood groups
 */
export const getAllBloodGroups = async (isActive?: boolean): Promise<BloodGroup[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ bloodGroups: BloodGroup[] }>>(
      `/api/v1/superadmin/masters/blood-groups?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.bloodGroups;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get blood group by ID
 */
export const getBloodGroupById = async (id: number): Promise<BloodGroup> => {
  try {
    const response = await apiClient.get<BloodGroup>(
      `/api/v1/superadmin/masters/blood-groups/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create blood group
 */
export const createBloodGroup = async (data: CreateBloodGroupData): Promise<BloodGroup> => {
  try {
    const response = await apiClient.post<BloodGroup>(
      '/api/v1/superadmin/masters/blood-groups',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update blood group
 */
export const updateBloodGroup = async (id: number, data: UpdateBloodGroupData): Promise<BloodGroup> => {
  try {
    const response = await apiClient.put<BloodGroup>(
      `/api/v1/superadmin/masters/blood-groups/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete blood group
 */
export const deleteBloodGroup = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/blood-groups/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
