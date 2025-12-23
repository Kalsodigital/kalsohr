import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface Country {
  id: number;
  name: string;
  code: string;
  iso2: string;
  phoneCode: string;
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

export interface CountryWithStates extends Country {
  states: State[];
}

export interface State {
  id: number;
  countryId: number;
  name: string;
  code: string;
  type: string;
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
  country?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface CreateCountryData {
  name: string;
  code: string;
  iso2: string;
  phoneCode: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateCountryData extends Partial<CreateCountryData> {}

/**
 * Get all countries
 */
export const getAllCountries = async (isActive?: boolean): Promise<Country[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const response = await apiClient.get<ApiResponse<{ countries: Country[] }>>(
      `/api/v1/superadmin/masters/countries?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.countries;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get country by ID
 */
export const getCountryById = async (id: number): Promise<CountryWithStates> => {
  try {
    const response = await apiClient.get<ApiResponse<{ country: CountryWithStates }>>(
      `/api/v1/superadmin/masters/countries/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.country;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create country
 */
export const createCountry = async (data: CreateCountryData): Promise<Country> => {
  try {
    const response = await apiClient.post<ApiResponse<{ country: Country }>>(
      '/api/v1/superadmin/masters/countries',
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.country;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update country
 */
export const updateCountry = async (id: number, data: UpdateCountryData): Promise<Country> => {
  try {
    const response = await apiClient.put<ApiResponse<{ country: Country }>>(
      `/api/v1/superadmin/masters/countries/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.country;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete country
 */
export const deleteCountry = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/superadmin/masters/countries/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
