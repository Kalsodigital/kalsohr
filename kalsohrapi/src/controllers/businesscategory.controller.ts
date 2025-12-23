import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all business categories
 * GET /api/superadmin/masters/business-categories
 * GET /api/:orgSlug/masters/business-categories (read-only for orgs)
 */
export const getAllBusinessCategories = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const businessCategories = await prisma.businessCategory.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
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
      businessCategories.forEach(category => {
        if (category.createdBy) userIds.add(category.createdBy);
        if (category.updatedBy) userIds.add(category.updatedBy);
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

      const businessCategoriesWithAudit = businessCategories.map(category => ({
        ...category,
        creator: category.createdBy ? userMap.get(category.createdBy) : null,
        updater: category.updatedBy ? userMap.get(category.updatedBy) : null,
      }));

      return sendSuccess(res, { businessCategories: businessCategoriesWithAudit }, 'Business categories retrieved successfully');
    }

    return sendSuccess(res, { businessCategories }, 'Business categories retrieved successfully');
  } catch (error) {
    console.error('Get business categories error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get business category by ID
 * GET /api/superadmin/masters/business-categories/:id
 */
export const getBusinessCategoryById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const businessCategory = await prisma.businessCategory.findUnique({
      where: { id: parseInt(id) },
    });

    if (!businessCategory) {
      return sendError(res, 'Business category not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (businessCategory.createdBy) userIds.push(businessCategory.createdBy);
      if (businessCategory.updatedBy) userIds.push(businessCategory.updatedBy);

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

      const businessCategoryWithAudit = {
        ...businessCategory,
        creator: businessCategory.createdBy ? userMap.get(businessCategory.createdBy) : null,
        updater: businessCategory.updatedBy ? userMap.get(businessCategory.updatedBy) : null,
      };

      return sendSuccess(res, { businessCategory: businessCategoryWithAudit }, 'Business category retrieved successfully');
    }

    return sendSuccess(res, { businessCategory }, 'Business category retrieved successfully');
  } catch (error) {
    console.error('Get business category error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new business category
 * POST /api/superadmin/masters/business-categories
 */
export const createBusinessCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, description, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    // Check for duplicate code
    const existingBusinessCategory = await prisma.businessCategory.findUnique({
      where: { code },
    });

    if (existingBusinessCategory) {
      return sendError(res, 'Business category with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const businessCategory = await prisma.businessCategory.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { businessCategory }, 'Business category created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create business category error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update business category
 * PUT /api/superadmin/masters/business-categories/:id
 */
export const updateBusinessCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, description, isActive, displayOrder } = req.body;

    // Check if business category exists
    const existingBusinessCategory = await prisma.businessCategory.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBusinessCategory) {
      return sendError(res, 'Business category not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingBusinessCategory.code) {
      const duplicateBusinessCategory = await prisma.businessCategory.findUnique({
        where: { code },
      });

      if (duplicateBusinessCategory) {
        return sendError(res, 'Business category with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const businessCategory = await prisma.businessCategory.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingBusinessCategory.name,
        code: code ? code.toUpperCase() : existingBusinessCategory.code,
        description: description !== undefined ? description : existingBusinessCategory.description,
        isActive: isActive !== undefined ? isActive : existingBusinessCategory.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingBusinessCategory.displayOrder,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { businessCategory }, 'Business category updated successfully');
  } catch (error) {
    console.error('Update business category error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete business category
 * DELETE /api/superadmin/masters/business-categories/:id
 */
export const deleteBusinessCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if business category exists
    const existingBusinessCategory = await prisma.businessCategory.findUnique({
      where: { id: parseInt(id) },
      include: { organizations: true },
    });

    if (!existingBusinessCategory) {
      return sendError(res, 'Business category not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if business category is being used by any organizations
    if (existingBusinessCategory.organizations.length > 0) {
      return sendError(
        res,
        `Cannot delete business category. It is being used by ${existingBusinessCategory.organizations.length} organization(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.businessCategory.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Business category deleted successfully');
  } catch (error) {
    console.error('Delete business category error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
