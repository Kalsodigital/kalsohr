import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface Gender {
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

export interface CreateGenderData {
  name: string;
  code: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateGenderData extends Partial<CreateGenderData> {}

/**
 * Get all genders
 */
export const getAllGenders = async (isActive?: boolean): Promise<Gender[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ genders: Gender[] }>>(
      `/api/v1/superadmin/masters/genders?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.genders;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get gender by ID
 */
export const getGenderById = async (id: number): Promise<Gender> => {
  try {
    const response = await apiClient.get<Gender>(
      `/api/v1/superadmin/masters/genders/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create gender
 */
export const createGender = async (data: CreateGenderData): Promise<Gender> => {
  try {
    const response = await apiClient.post<Gender>(
      '/api/v1/superadmin/masters/genders',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update gender
 */
export const updateGender = async (id: number, data: UpdateGenderData): Promise<Gender> => {
  try {
    const response = await apiClient.put<Gender>(
      `/api/v1/superadmin/masters/genders/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete gender
 */
export const deleteGender = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/genders/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
