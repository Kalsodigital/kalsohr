import apiClient, { handleApiError } from '../client';

export interface City {
  id: number;
  stateId: number;
  name: string;
  code: string;
  type: string; // "City", "District", "Town"
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
  state?: {
    id: number;
    name: string;
    code: string;
    country: {
      id: number;
      name: string;
      code: string;
    };
  };
}

export interface CreateCityData {
  stateId: number;
  name: string;
  code: string;
  type: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateCityData extends Partial<CreateCityData> {}

/**
 * Get all cities
 */
export const getAllCities = async (
  isActive?: boolean,
  stateId?: number,
  countryId?: number,
  type?: string
): Promise<City[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }
    if (stateId !== undefined) {
      params.append('stateId', String(stateId));
    }
    if (countryId !== undefined) {
      params.append('countryId', String(countryId));
    }
    if (type) {
      params.append('type', type);
    }

    const response = await apiClient.get<{ success: boolean; data: { cities: City[] } }>(
      `/api/v1/superadmin/masters/cities?${params.toString()}`
    );

    return response.data.data.cities;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get city by ID
 */
export const getCityById = async (id: number): Promise<City> => {
  try {
    const response = await apiClient.get<City>(
      `/api/v1/superadmin/masters/cities/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create city
 */
export const createCity = async (data: CreateCityData): Promise<City> => {
  try {
    const response = await apiClient.post<City>(
      '/api/v1/superadmin/masters/cities',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update city
 */
export const updateCity = async (id: number, data: UpdateCityData): Promise<City> => {
  try {
    const response = await apiClient.put<City>(
      `/api/v1/superadmin/masters/cities/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete city
 */
export const deleteCity = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/cities/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
