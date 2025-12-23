import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all document types
 * GET /api/superadmin/masters/document-types
 * GET /api/:orgSlug/masters/document-types (read-only for orgs)
 */
export const getAllDocumentTypes = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive, category, isMandatory } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (category) {
      whereClause.category = category;
    }

    if (isMandatory !== undefined) {
      whereClause.isMandatory = isMandatory === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const documentTypes = await prisma.documentType.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        category: true,
        isMandatory: true,
        isActive: true,
        displayOrder: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      documentTypes.forEach(docType => {
        if (docType.createdBy) userIds.add(docType.createdBy);
        if (docType.updatedBy) userIds.add(docType.updatedBy);
      });

      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      const documentTypesWithAudit = documentTypes.map(docType => ({
        ...docType,
        creator: docType.createdBy ? userMap.get(docType.createdBy) : null,
        updater: docType.updatedBy ? userMap.get(docType.updatedBy) : null,
      }));

      return sendSuccess(res, { documentTypes: documentTypesWithAudit }, 'Document types retrieved successfully');
    }

    return sendSuccess(res, { documentTypes }, 'Document types retrieved successfully');
  } catch (error) {
    console.error('Get document types error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get document type by ID
 * GET /api/superadmin/masters/document-types/:id
 */
export const getDocumentTypeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const documentType = await prisma.documentType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!documentType) {
      return sendError(res, 'Document type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (documentType.createdBy) userIds.push(documentType.createdBy);
      if (documentType.updatedBy) userIds.push(documentType.updatedBy);

      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      const documentTypeWithAudit = {
        ...documentType,
        creator: documentType.createdBy ? userMap.get(documentType.createdBy) : null,
        updater: documentType.updatedBy ? userMap.get(documentType.updatedBy) : null,
      };

      return sendSuccess(res, { documentType: documentTypeWithAudit }, 'Document type retrieved successfully');
    }

    return sendSuccess(res, { documentType }, 'Document type retrieved successfully');
  } catch (error) {
    console.error('Get document type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new document type
 * POST /api/superadmin/masters/document-types
 */
export const createDocumentType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, category, isMandatory, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    if (!category) {
      return sendError(res, 'Category is required', STATUS_CODES.BAD_REQUEST);
    }

    // Validate category
    const validCategories = ['Identity', 'Education', 'Employment', 'Financial', 'Medical'];
    if (!validCategories.includes(category)) {
      return sendError(res, `Category must be one of: ${validCategories.join(', ')}`, STATUS_CODES.BAD_REQUEST);
    }

    // Check for duplicate code
    const existingDocumentType = await prisma.documentType.findUnique({
      where: { code },
    });

    if (existingDocumentType) {
      return sendError(res, 'Document type with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const documentType = await prisma.documentType.create({
      data: {
        name,
        code: code.toUpperCase(),
        category,
        isMandatory: isMandatory !== undefined ? isMandatory : false,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { documentType }, 'Document type created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create document type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update document type
 * PUT /api/superadmin/masters/document-types/:id
 */
export const updateDocumentType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, category, isMandatory, isActive, displayOrder } = req.body;

    // Check if document type exists
    const existingDocumentType = await prisma.documentType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingDocumentType) {
      return sendError(res, 'Document type not found', STATUS_CODES.NOT_FOUND);
    }

    // Validate category if provided
    if (category) {
      const validCategories = ['Identity', 'Education', 'Employment', 'Financial', 'Medical'];
      if (!validCategories.includes(category)) {
        return sendError(res, `Category must be one of: ${validCategories.join(', ')}`, STATUS_CODES.BAD_REQUEST);
      }
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingDocumentType.code) {
      const duplicateDocumentType = await prisma.documentType.findUnique({
        where: { code },
      });

      if (duplicateDocumentType) {
        return sendError(res, 'Document type with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const documentType = await prisma.documentType.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingDocumentType.name,
        code: code ? code.toUpperCase() : existingDocumentType.code,
        category: category || existingDocumentType.category,
        isMandatory: isMandatory !== undefined ? isMandatory : existingDocumentType.isMandatory,
        isActive: isActive !== undefined ? isActive : existingDocumentType.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingDocumentType.displayOrder,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { documentType }, 'Document type updated successfully');
  } catch (error) {
    console.error('Update document type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete document type
 * DELETE /api/superadmin/masters/document-types/:id
 */
export const deleteDocumentType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if document type exists
    const existingDocumentType = await prisma.documentType.findUnique({
      where: { id: parseInt(id) },
      include: { documents: true },
    });

    if (!existingDocumentType) {
      return sendError(res, 'Document type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if document type is being used by any employee documents
    if (existingDocumentType.documents.length > 0) {
      return sendError(
        res,
        `Cannot delete document type. It is being used by ${existingDocumentType.documents.length} document(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.documentType.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Document type deleted successfully');
  } catch (error) {
    console.error('Delete document type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
