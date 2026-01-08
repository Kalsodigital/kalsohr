import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface EducationLevel {
  id: number;
  name: string;
  code: string;
  level: number;
  isActive: boolean;
  displayOrder: number;
}

/**
 * Get all education levels for organization
 */
export const getAllEducationLevels = async (orgSlug: string, isActive?: boolean): Promise<EducationLevel[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ educationLevels: EducationLevel[] }>>(
      `/api/v1/${orgSlug}/masters/education-levels?${params.toString()}`
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
export const getEducationLevelById = async (orgSlug: string, id: number): Promise<EducationLevel> => {
  try {
    const response = await apiClient.get<ApiResponse<{ educationLevel: EducationLevel }>>(
      `/api/v1/${orgSlug}/masters/education-levels/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.educationLevel;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
