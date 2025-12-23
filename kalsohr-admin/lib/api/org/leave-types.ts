import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface LeaveType {
  id: number;
  organizationId: number;
  name: string;
  code: string | null;
  description: string | null;
  daysPerYear: number;
  isPaid: boolean;
  requiresApproval: boolean;
  maxConsecutiveDays: number | null;
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
  _count?: {
    leaveBalances: number;
    leaveRequests: number;
  };
}

export interface CreateLeaveTypeData {
  name: string;
  code?: string;
  description?: string;
  daysPerYear: number;
  isPaid?: boolean;
  requiresApproval?: boolean;
  maxConsecutiveDays?: number;
  isActive?: boolean;
}

export interface UpdateLeaveTypeData extends Partial<CreateLeaveTypeData> {}

/**
 * Get all leave types for an organization
 */
export const getAllLeaveTypes = async (orgSlug: string, isActive?: boolean): Promise<LeaveType[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/leave-types?${queryString}`
      : `/api/v1/${orgSlug}/masters/leave-types`;

    const response = await apiClient.get<ApiResponse<{ leaveTypes: LeaveType[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.leaveTypes;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get leave type by ID
 */
export const getLeaveTypeById = async (orgSlug: string, id: number): Promise<LeaveType> => {
  try {
    const response = await apiClient.get<ApiResponse<{ leaveType: LeaveType }>>(
      `/api/v1/${orgSlug}/masters/leave-types/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.leaveType;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create leave type
 */
export const createLeaveType = async (orgSlug: string, data: CreateLeaveTypeData): Promise<LeaveType> => {
  try {
    const response = await apiClient.post<ApiResponse<{ leaveType: LeaveType }>>(
      `/api/v1/${orgSlug}/masters/leave-types`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.leaveType;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update leave type
 */
export const updateLeaveType = async (
  orgSlug: string,
  id: number,
  data: UpdateLeaveTypeData
): Promise<LeaveType> => {
  try {
    const response = await apiClient.put<ApiResponse<{ leaveType: LeaveType }>>(
      `/api/v1/${orgSlug}/masters/leave-types/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.leaveType;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete leave type
 */
export const deleteLeaveType = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/masters/leave-types/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
