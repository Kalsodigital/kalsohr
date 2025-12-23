import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all industry types
 * GET /api/superadmin/masters/industry-types
 * GET /api/:orgSlug/masters/industry-types (read-only for orgs)
 */
export const getAllIndustryTypes = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const industryTypes = await prisma.industryType.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        icon: true,
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
      industryTypes.forEach(type => {
        if (type.createdBy) userIds.add(type.createdBy);
        if (type.updatedBy) userIds.add(type.updatedBy);
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

      const industryTypesWithAudit = industryTypes.map(type => ({
        ...type,
        creator: type.createdBy ? userMap.get(type.createdBy) : null,
        updater: type.updatedBy ? userMap.get(type.updatedBy) : null,
      }));

      return sendSuccess(res, { industryTypes: industryTypesWithAudit }, 'Industry types retrieved successfully');
    }

    return sendSuccess(res, { industryTypes }, 'Industry types retrieved successfully');
  } catch (error) {
    console.error('Get industry types error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get industry type by ID
 * GET /api/superadmin/masters/industry-types/:id
 */
export const getIndustryTypeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const industryType = await prisma.industryType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!industryType) {
      return sendError(res, 'Industry type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (industryType.createdBy) userIds.push(industryType.createdBy);
      if (industryType.updatedBy) userIds.push(industryType.updatedBy);

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

      const industryTypeWithAudit = {
        ...industryType,
        creator: industryType.createdBy ? userMap.get(industryType.createdBy) : null,
        updater: industryType.updatedBy ? userMap.get(industryType.updatedBy) : null,
      };

      return sendSuccess(res, { industryType: industryTypeWithAudit }, 'Industry type retrieved successfully');
    }

    return sendSuccess(res, { industryType }, 'Industry type retrieved successfully');
  } catch (error) {
    console.error('Get industry type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new industry type
 * POST /api/superadmin/masters/industry-types
 */
export const createIndustryType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, description, icon, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    // Check for duplicate code
    const existingIndustryType = await prisma.industryType.findUnique({
      where: { code },
    });

    if (existingIndustryType) {
      return sendError(res, 'Industry type with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const industryType = await prisma.industryType.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description || null,
        icon: icon || null,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { industryType }, 'Industry type created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create industry type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update industry type
 * PUT /api/superadmin/masters/industry-types/:id
 */
export const updateIndustryType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, description, icon, isActive, displayOrder } = req.body;

    // Check if industry type exists
    const existingIndustryType = await prisma.industryType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingIndustryType) {
      return sendError(res, 'Industry type not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingIndustryType.code) {
      const duplicateIndustryType = await prisma.industryType.findUnique({
        where: { code },
      });

      if (duplicateIndustryType) {
        return sendError(res, 'Industry type with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const industryType = await prisma.industryType.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingIndustryType.name,
        code: code ? code.toUpperCase() : existingIndustryType.code,
        description: description !== undefined ? description : existingIndustryType.description,
        icon: icon !== undefined ? icon : existingIndustryType.icon,
        isActive: isActive !== undefined ? isActive : existingIndustryType.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingIndustryType.displayOrder,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { industryType }, 'Industry type updated successfully');
  } catch (error) {
    console.error('Update industry type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete industry type
 * DELETE /api/superadmin/masters/industry-types/:id
 */
export const deleteIndustryType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if industry type exists
    const existingIndustryType = await prisma.industryType.findUnique({
      where: { id: parseInt(id) },
      include: { organizations: true },
    });

    if (!existingIndustryType) {
      return sendError(res, 'Industry type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if industry type is being used by any organizations
    if (existingIndustryType.organizations.length > 0) {
      return sendError(
        res,
        `Cannot delete industry type. It is being used by ${existingIndustryType.organizations.length} organization(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.industryType.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Industry type deleted successfully');
  } catch (error) {
    console.error('Delete industry type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
