import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface OrganizationalPosition {
  id: number;
  organizationId: number;
  title: string;
  code: string | null;
  description: string | null;
  departmentId: number;
  designationId: number;
  reportingPositionId: number | null;
  headCount: number;
  isActive: boolean;
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
  department?: {
    id: number;
    name: string;
    code: string | null;
  };
  designation?: {
    id: number;
    name: string;
    code: string | null;
    level: number | null;
  };
  reportingPosition?: {
    id: number;
    title: string;
    code: string | null;
  };
  _count?: {
    employees: number;
    subordinatePositions: number;
  };
}

export interface CreateOrganizationalPositionData {
  title: string;
  code?: string;
  description?: string;
  departmentId: number;
  designationId: number;
  reportingPositionId?: number;
  headCount?: number;
  isActive?: boolean;
}

export interface UpdateOrganizationalPositionData extends Partial<CreateOrganizationalPositionData> {}

export interface OrganizationalPositionFilters {
  isActive?: boolean;
  departmentId?: number;
  designationId?: number;
}

/**
 * Get all organizational positions for an organization
 */
export const getAllOrganizationalPositions = async (
  orgSlug: string,
  filters?: OrganizationalPositionFilters
): Promise<OrganizationalPosition[]> => {
  try {
    const params = new URLSearchParams();

    if (filters?.isActive !== undefined) {
      params.append('isActive', String(filters.isActive));
    }
    if (filters?.departmentId !== undefined) {
      params.append('departmentId', String(filters.departmentId));
    }
    if (filters?.designationId !== undefined) {
      params.append('designationId', String(filters.designationId));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/organizational-positions?${queryString}`
      : `/api/v1/${orgSlug}/masters/organizational-positions`;

    const response = await apiClient.get<ApiResponse<{ organizationalPositions: OrganizationalPosition[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.organizationalPositions;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get organizational position by ID
 */
export const getOrganizationalPositionById = async (
  orgSlug: string,
  id: number
): Promise<OrganizationalPosition> => {
  try {
    const response = await apiClient.get<ApiResponse<{ organizationalPosition: OrganizationalPosition }>>(
      `/api/v1/${orgSlug}/masters/organizational-positions/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.organizationalPosition;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create organizational position
 */
export const createOrganizationalPosition = async (
  orgSlug: string,
  data: CreateOrganizationalPositionData
): Promise<OrganizationalPosition> => {
  try {
    const response = await apiClient.post<ApiResponse<{ organizationalPosition: OrganizationalPosition }>>(
      `/api/v1/${orgSlug}/masters/organizational-positions`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.organizationalPosition;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update organizational position
 */
export const updateOrganizationalPosition = async (
  orgSlug: string,
  id: number,
  data: UpdateOrganizationalPositionData
): Promise<OrganizationalPosition> => {
  try {
    const response = await apiClient.put<ApiResponse<{ organizationalPosition: OrganizationalPosition }>>(
      `/api/v1/${orgSlug}/masters/organizational-positions/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.organizationalPosition;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete organizational position
 */
export const deleteOrganizationalPosition = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/masters/organizational-positions/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
