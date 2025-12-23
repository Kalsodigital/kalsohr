import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface DocumentType {
  id: number;
  name: string;
  code: string;
  category: string; // Identity, Education, Employment, Financial, Medical
  isMandatory: boolean;
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

export interface CreateDocumentTypeData {
  name: string;
  code: string;
  category: string;
  isMandatory?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateDocumentTypeData extends Partial<CreateDocumentTypeData> {}

/**
 * Get all document types
 */
export const getAllDocumentTypes = async (
  isActive?: boolean,
  category?: string,
  isMandatory?: boolean
): Promise<DocumentType[]> => {
  try {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }
    if (category) {
      params.append('category', category);
    }
    if (isMandatory !== undefined) {
      params.append('isMandatory', String(isMandatory));
    }

    const response = await apiClient.get<ApiResponse<{ documentTypes: DocumentType[] }>>(
      `/api/v1/superadmin/masters/document-types?${params.toString()}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.documentTypes;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get document type by ID
 */
export const getDocumentTypeById = async (id: number): Promise<DocumentType> => {
  try {
    const response = await apiClient.get<DocumentType>(
      `/api/v1/superadmin/masters/document-types/${id}`
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create document type
 */
export const createDocumentType = async (data: CreateDocumentTypeData): Promise<DocumentType> => {
  try {
    const response = await apiClient.post<DocumentType>(
      '/api/v1/superadmin/masters/document-types',
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update document type
 */
export const updateDocumentType = async (id: number, data: UpdateDocumentTypeData): Promise<DocumentType> => {
  try {
    const response = await apiClient.put<DocumentType>(
      `/api/v1/superadmin/masters/document-types/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete document type
 */
export const deleteDocumentType = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(
      `/api/v1/superadmin/masters/document-types/${id}`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
