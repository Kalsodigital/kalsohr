import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface IndustryType {
  id: number;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
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

export interface CreateIndustryTypeData {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateIndustryTypeData extends Partial<CreateIndustryTypeData> {}

/**
 * Get all industry types
 */
export const getAllIndustryTypes = async (isActive?: boolean): Promise<IndustryType[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ industryTypes: IndustryType[] }>>(
      `/api/v1/superadmin/masters/industry-types?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.industryTypes;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get industry type by ID
 */
export const getIndustryTypeById = async (id: number): Promise<IndustryType> => {
  try {
    const response = await apiClient.get<IndustryType>(
      `/api/v1/superadmin/masters/industry-types/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create industry type
 */
export const createIndustryType = async (data: CreateIndustryTypeData): Promise<IndustryType> => {
  try {
    const response = await apiClient.post<IndustryType>(
      '/api/v1/superadmin/masters/industry-types',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update industry type
 */
export const updateIndustryType = async (id: number, data: UpdateIndustryTypeData): Promise<IndustryType> => {
  try {
    const response = await apiClient.put<IndustryType>(
      `/api/v1/superadmin/masters/industry-types/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete industry type
 */
export const deleteIndustryType = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/industry-types/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
