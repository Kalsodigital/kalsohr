import apiClient, { handleApiError } from './client';
import { ApiResponse } from '@/lib/types/api';
import {
  User,
  UsersResponse,
  UserResponse,
  CreateUserData,
  UpdateUserData,
  UserFilters,
} from '@/lib/types/user';

/**
 * Get all users (Super Admin only)
 */
export const getUsers = async (filters?: UserFilters): Promise<UsersResponse['data']> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.organizationId) queryParams.append('organizationId', filters.organizationId.toString());
    if (filters?.roleId) queryParams.append('roleId', filters.roleId.toString());
    if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());

    const response = await apiClient.get<UsersResponse>(
      `/api/v1/superadmin/users?${queryParams.toString()}`
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
 * Get user by ID (Super Admin only)
 */
export const getUserById = async (id: number): Promise<User> => {
  try {
    const response = await apiClient.get<UserResponse>(
      `/api/v1/superadmin/users/${id}`
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
 * Create user (Super Admin only)
 */
export const createUser = async (data: CreateUserData): Promise<User> => {
  try {
    const response = await apiClient.post<UserResponse>(
      '/api/v1/superadmin/users',
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
 * Update user (Super Admin only)
 */
export const updateUser = async (id: number, data: UpdateUserData): Promise<User> => {
  try {
    const response = await apiClient.put<UserResponse>(
      `/api/v1/superadmin/users/${id}`,
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
 * Delete user (Super Admin only)
 */
export const deleteUser = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/superadmin/users/${id}`
    );

    if (!response.data.success) {
      throw new Error('Failed to delete user');
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
