import apiClient, { handleApiError } from './client';
import { ApiResponse } from '@/lib/types/api';

// User info for audit fields
export interface AuditUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface Role {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  organizationId: number | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  creator?: AuditUser | null;
  updater?: AuditUser | null;
  organization?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  _count?: {
    users: number;
    rolePermissions: number;
  };
}

export interface RolePermission {
  id: number;
  roleId: number;
  moduleCode: string;
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

/**
 * Get platform-level roles (organizationId = NULL)
 */
export const getPlatformRoles = async (): Promise<Role[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ roles: Role[] }>>(
      '/api/v1/superadmin/platform-roles'
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch platform roles');
    }

    return response.data.data.roles;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get roles for a specific organization
 */
export const getOrganizationRoles = async (organizationId: number): Promise<Role[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ roles: Role[] }>>(
      `/api/v1/superadmin/org-roles?organizationId=${organizationId}`
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch organization roles');
    }

    return response.data.data.roles;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get all roles with optional organization filter
 */
export const getAllRoles = async (params?: {
  organizationId?: number;
  page?: number;
  limit?: number;
}): Promise<{ roles: Role[]; pagination: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.organizationId) queryParams.append('organizationId', params.organizationId.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<ApiResponse<{ roles: Role[]; pagination: any }>>(
      `/api/v1/superadmin/roles?${queryParams.toString()}`
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch roles');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get role by ID with permissions
 */
export const getRoleById = async (id: number): Promise<Role> => {
  try {
    const response = await apiClient.get<ApiResponse<{ role: Role }>>(
      `/api/v1/superadmin/roles/${id}`
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch role');
    }

    return response.data.data.role;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create a new role
 */
export const createRole = async (data: {
  name: string;
  code?: string;
  description?: string;
  organizationId?: number | null;
  permissions?: Array<{
    moduleCode: string;
    canRead?: boolean;
    canWrite?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    canExport?: boolean;
  }>;
}): Promise<Role> => {
  try {
    const response = await apiClient.post<ApiResponse<{ role: Role }>>(
      '/api/v1/superadmin/roles',
      data
    );

    if (!response.data.success) {
      throw new Error('Failed to create role');
    }

    return response.data.data.role;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update role
 */
export const updateRole = async (
  id: number,
  data: {
    name?: string;
    code?: string;
    description?: string;
    isActive?: boolean;
  }
): Promise<Role> => {
  try {
    const response = await apiClient.put<ApiResponse<{ role: Role }>>(
      `/api/v1/superadmin/roles/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error('Failed to update role');
    }

    return response.data.data.role;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete role
 */
export const deleteRole = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/superadmin/roles/${id}`
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
export const getRolePermissions = async (roleId: number): Promise<any> => {
  try {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/superadmin/permissions/${roleId}`
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch role permissions');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update permissions for a role
 */
export const updateRolePermissions = async (
  roleId: number,
  permissions: Array<{
    moduleCode: string;
    canRead?: boolean;
    canWrite?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    canExport?: boolean;
  }>
): Promise<RolePermission[]> => {
  try {
    const response = await apiClient.put<ApiResponse<{ permissions: RolePermission[] }>>(
      `/api/v1/superadmin/permissions/${roleId}`,
      { permissions }
    );

    if (!response.data.success) {
      throw new Error('Failed to update permissions');
    }

    return response.data.data.permissions;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
