import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';
import { State } from './countries';

export interface CreateStateData {
  countryId: number;
  name: string;
  code: string;
  type?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateStateData extends Partial<Omit<CreateStateData, 'countryId'>> {}

/**
 * Get all states
 */
export const getAllStates = async (countryId?: number, isActive?: boolean): Promise<State[]> => {
  try {
    const params = new URLSearchParams();
    if (countryId !== undefined) {
      params.append('countryId', String(countryId));
    }
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ states: State[] }>>(
      `/api/v1/superadmin/masters/states?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.states;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get state by ID
 */
export const getStateById = async (id: number): Promise<State> => {
  try {
    const response = await apiClient.get<ApiResponse<{ state: State }>>(
      `/api/v1/superadmin/masters/states/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.state;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create state
 */
export const createState = async (data: CreateStateData): Promise<State> => {
  try {
    const response = await apiClient.post<ApiResponse<{ state: State }>>(
      '/api/v1/superadmin/masters/states',
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.state;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update state
 */
export const updateState = async (id: number, data: UpdateStateData): Promise<State> => {
  try {
    const response = await apiClient.put<ApiResponse<{ state: State }>>(
      `/api/v1/superadmin/masters/states/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.state;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete state
 */
export const deleteState = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/superadmin/masters/states/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
