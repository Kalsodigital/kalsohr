import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface Holiday {
  id: number;
  organizationId: number;
  date: string;
  name: string;
  description: string | null;
  type: 'National' | 'Religious' | 'Company' | 'Regional';
  isOptional: boolean;
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
}

export interface CreateHolidayData {
  date: string;
  name: string;
  description?: string;
  type: 'National' | 'Religious' | 'Company' | 'Regional';
  isOptional?: boolean;
  isActive?: boolean;
}

export interface UpdateHolidayData extends Partial<CreateHolidayData> {}

export interface HolidayFilters {
  year?: number;
  month?: number;
  type?: string;
  isOptional?: boolean;
  isActive?: boolean;
}

/**
 * Get all holidays for an organization
 */
export const getAllHolidays = async (orgSlug: string, filters?: HolidayFilters): Promise<Holiday[]> => {
  try {
    const params = new URLSearchParams();

    if (filters?.year !== undefined) {
      params.append('year', String(filters.year));
    }
    if (filters?.month !== undefined) {
      params.append('month', String(filters.month));
    }
    if (filters?.type) {
      params.append('type', filters.type);
    }
    if (filters?.isOptional !== undefined) {
      params.append('isOptional', String(filters.isOptional));
    }
    if (filters?.isActive !== undefined) {
      params.append('isActive', String(filters.isActive));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/holidays?${queryString}`
      : `/api/v1/${orgSlug}/masters/holidays`;

    const response = await apiClient.get<ApiResponse<{ holidays: Holiday[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.holidays;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get holiday by ID
 */
export const getHolidayById = async (orgSlug: string, id: number): Promise<Holiday> => {
  try {
    const response = await apiClient.get<ApiResponse<{ holiday: Holiday }>>(
      `/api/v1/${orgSlug}/masters/holidays/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.holiday;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create holiday
 */
export const createHoliday = async (orgSlug: string, data: CreateHolidayData): Promise<Holiday> => {
  try {
    const response = await apiClient.post<ApiResponse<{ holiday: Holiday }>>(
      `/api/v1/${orgSlug}/masters/holidays`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.holiday;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update holiday
 */
export const updateHoliday = async (
  orgSlug: string,
  id: number,
  data: UpdateHolidayData
): Promise<Holiday> => {
  try {
    const response = await apiClient.put<ApiResponse<{ holiday: Holiday }>>(
      `/api/v1/${orgSlug}/masters/holidays/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.holiday;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete holiday
 */
export const deleteHoliday = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/masters/holidays/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
