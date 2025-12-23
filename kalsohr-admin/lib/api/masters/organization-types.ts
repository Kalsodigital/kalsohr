import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface OrganizationType {
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

export interface CreateOrganizationTypeData {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateOrganizationTypeData extends Partial<CreateOrganizationTypeData> {}

/**
 * Get all organization types
 */
export const getAllOrganizationTypes = async (isActive?: boolean): Promise<OrganizationType[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ organizationTypes: OrganizationType[] }>>(
      `/api/v1/superadmin/masters/organization-types?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.organizationTypes;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get organization type by ID
 */
export const getOrganizationTypeById = async (id: number): Promise<OrganizationType> => {
  try {
    const response = await apiClient.get<OrganizationType>(
      `/api/v1/superadmin/masters/organization-types/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create organization type
 */
export const createOrganizationType = async (data: CreateOrganizationTypeData): Promise<OrganizationType> => {
  try {
    const response = await apiClient.post<OrganizationType>(
      '/api/v1/superadmin/masters/organization-types',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update organization type
 */
export const updateOrganizationType = async (id: number, data: UpdateOrganizationTypeData): Promise<OrganizationType> => {
  try {
    const response = await apiClient.put<OrganizationType>(
      `/api/v1/superadmin/masters/organization-types/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete organization type
 */
export const deleteOrganizationType = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/organization-types/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
