import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';
import {
  OrgRole,
  OrgRolesResponse,
  OrgRoleResponse,
  RolePermission,
  RolePermissionsResponse,
  CreateOrgRoleData,
  UpdateOrgRoleData,
  UpdateRolePermissionsData,
} from '@/lib/types/org';

/**
 * Get all roles for an organization
 */
export const getOrgRoles = async (orgSlug: string): Promise<OrgRole[]> => {
  try {
    const response = await apiClient.get<OrgRolesResponse>(
      `/api/${orgSlug}/roles`
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch roles');
    }

    return response.data.data.roles;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get role by ID
 */
export const getOrgRoleById = async (orgSlug: string, id: number): Promise<OrgRole> => {
  try {
    const response = await apiClient.get<OrgRoleResponse>(
      `/api/${orgSlug}/roles/${id}`
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch role');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create a new role
 */
export const createOrgRole = async (orgSlug: string, data: CreateOrgRoleData): Promise<OrgRole> => {
  try {
    const response = await apiClient.post<OrgRoleResponse>(
      `/api/${orgSlug}/roles`,
      data
    );

    if (!response.data.success) {
      throw new Error('Failed to create role');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update a role
 */
export const updateOrgRole = async (
  orgSlug: string,
  id: number,
  data: UpdateOrgRoleData
): Promise<OrgRole> => {
  try {
    const response = await apiClient.put<OrgRoleResponse>(
      `/api/${orgSlug}/roles/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error('Failed to update role');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete a role
 */
export const deleteOrgRole = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/${orgSlug}/roles/${id}`
    );

    if (!response.data.success) {
      throw new Error('Failed to delete role');
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get permissions for a role
 */
export const getOrgRolePermissions = async (
  orgSlug: string,
  roleId: number
): Promise<RolePermission[]> => {
  try {
    const response = await apiClient.get<RolePermissionsResponse>(
      `/api/${orgSlug}/permissions/${roleId}`
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch permissions');
    }

    return response.data.data.permissions;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update permissions for a role
 */
export const updateOrgRolePermissions = async (
  orgSlug: string,
  roleId: number,
  data: UpdateRolePermissionsData
): Promise<void> => {
  try {
    const response = await apiClient.put<ApiResponse>(
      `/api/${orgSlug}/permissions/${roleId}`,
      data
    );

    if (!response.data.success) {
      throw new Error('Failed to update permissions');
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
