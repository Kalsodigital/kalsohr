import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface EducationLevel {
  id: number;
  name: string;
  code: string;
  level: number;
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

export interface CreateEducationLevelData {
  name: string;
  code: string;
  level: number;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateEducationLevelData extends Partial<CreateEducationLevelData> {}

/**
 * Get all education levels
 */
export const getAllEducationLevels = async (isActive?: boolean): Promise<EducationLevel[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ educationLevels: EducationLevel[] }>>(
      `/api/v1/superadmin/masters/education-levels?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.educationLevels;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get education level by ID
 */
export const getEducationLevelById = async (id: number): Promise<EducationLevel> => {
  try {
    const response = await apiClient.get<EducationLevel>(
      `/api/v1/superadmin/masters/education-levels/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create education level
 */
export const createEducationLevel = async (data: CreateEducationLevelData): Promise<EducationLevel> => {
  try {
    const response = await apiClient.post<EducationLevel>(
      '/api/v1/superadmin/masters/education-levels',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update education level
 */
export const updateEducationLevel = async (id: number, data: UpdateEducationLevelData): Promise<EducationLevel> => {
  try {
    const response = await apiClient.put<EducationLevel>(
      `/api/v1/superadmin/masters/education-levels/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete education level
 */
export const deleteEducationLevel = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/education-levels/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
