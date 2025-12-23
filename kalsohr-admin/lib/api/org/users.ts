import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';
import {
  OrgUser,
  OrgUsersResponse,
  OrgUserResponse,
  CreateOrgUserData,
  UpdateOrgUserData,
  OrgUserFilters,
} from '@/lib/types/org';

/**
 * Get all users for an organization
 */
export const getOrgUsers = async (
  orgSlug: string,
  filters?: OrgUserFilters
): Promise<OrgUsersResponse['data']> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.roleId) queryParams.append('roleId', filters.roleId.toString());
    if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());

    const response = await apiClient.get<OrgUsersResponse>(
      `/api/${orgSlug}/users?${queryParams.toString()}`
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch users');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get user by ID
 */
export const getOrgUserById = async (orgSlug: string, id: number): Promise<OrgUser> => {
  try {
    const response = await apiClient.get<OrgUserResponse>(
      `/api/${orgSlug}/users/${id}`
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch user');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create a new user
 */
export const createOrgUser = async (
  orgSlug: string,
  data: CreateOrgUserData
): Promise<OrgUser> => {
  try {
    const response = await apiClient.post<OrgUserResponse>(
      `/api/${orgSlug}/users`,
      data
    );

    if (!response.data.success) {
      throw new Error('Failed to create user');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update a user
 */
export const updateOrgUser = async (
  orgSlug: string,
  id: number,
  data: UpdateOrgUserData
): Promise<OrgUser> => {
  try {
    const response = await apiClient.put<OrgUserResponse>(
      `/api/${orgSlug}/users/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error('Failed to update user');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete a user
 */
export const deleteOrgUser = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/${orgSlug}/users/${id}`
    );

    if (!response.data.success) {
      throw new Error('Failed to delete user');
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
