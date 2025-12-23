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
}

export interface State {
  id: number;
  countryId: number;
  name: string;
  code: string;
  type: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  country: {
    id: number;
    name: string;
    code: string;
  };
}

export interface City {
  id: number;
  stateId: number;
  name: string;
  type: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  state: {
    id: number;
    countryId: number;
    name: string;
    code: string;
    country: {
      id: number;
      name: string;
      code: string;
    };
  };
}

/**
 * Get all countries for an organization
 * This is read-only master data accessible to all org users
 */
export const getAllCountries = async (orgSlug: string, isActive?: boolean): Promise<Country[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/countries?${queryString}`
      : `/api/v1/${orgSlug}/masters/countries`;

    const response = await apiClient.get<ApiResponse<{ countries: Country[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.countries;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get all states for an organization
 * Supports filtering by countryId
 */
export const getAllStates = async (orgSlug: string, countryId?: number, isActive?: boolean): Promise<State[]> => {
  try {
    const params = new URLSearchParams();
    if (countryId !== undefined) {
      params.append('countryId', String(countryId));
    }
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/states?${queryString}`
      : `/api/v1/${orgSlug}/masters/states`;

    const response = await apiClient.get<ApiResponse<{ states: State[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.states;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get all cities for an organization
 * Supports filtering by stateId or countryId
 */
export const getAllCities = async (
  orgSlug: string,
  stateId?: number,
  countryId?: number,
  isActive?: boolean
): Promise<City[]> => {
  try {
    const params = new URLSearchParams();
    if (stateId !== undefined) {
      params.append('stateId', String(stateId));
    }
    if (countryId !== undefined) {
      params.append('countryId', String(countryId));
    }
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/cities?${queryString}`
      : `/api/v1/${orgSlug}/masters/cities`;

    const response = await apiClient.get<ApiResponse<{ cities: City[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.cities;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
