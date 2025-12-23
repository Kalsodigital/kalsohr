import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface BusinessCategory {
  id: number;
  name: string;
  code: string;
  description: string | null;
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

export interface CreateBusinessCategoryData {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateBusinessCategoryData extends Partial<CreateBusinessCategoryData> {}

/**
 * Get all business categories
 */
export const getAllBusinessCategories = async (isActive?: boolean): Promise<BusinessCategory[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ businessCategories: BusinessCategory[] }>>(
      `/api/v1/superadmin/masters/business-categories?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.businessCategories;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get business category by ID
 */
export const getBusinessCategoryById = async (id: number): Promise<BusinessCategory> => {
  try {
    const response = await apiClient.get<BusinessCategory>(
      `/api/v1/superadmin/masters/business-categories/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create business category
 */
export const createBusinessCategory = async (data: CreateBusinessCategoryData): Promise<BusinessCategory> => {
  try {
    const response = await apiClient.post<BusinessCategory>(
      '/api/v1/superadmin/masters/business-categories',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update business category
 */
export const updateBusinessCategory = async (id: number, data: UpdateBusinessCategoryData): Promise<BusinessCategory> => {
  try {
    const response = await apiClient.put<BusinessCategory>(
      `/api/v1/superadmin/masters/business-categories/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete business category
 */
export const deleteBusinessCategory = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/business-categories/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
