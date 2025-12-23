import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all employment types for the organization
 * GET /api/:orgSlug/masters/employment-types
 */
export const getAllEmploymentTypes = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { isActive } = req.query;

    const where: any = {
      organizationId,
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const employmentTypes = await prisma.employmentType.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      employmentTypes.forEach(item => {
        if (item.createdBy) userIds.add(item.createdBy);
        if (item.updatedBy) userIds.add(item.updatedBy);
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

      const employmentTypesWithAudit = employmentTypes.map(item => ({
        ...item,
        creator: item.createdBy ? userMap.get(item.createdBy) : null,
        updater: item.updatedBy ? userMap.get(item.updatedBy) : null,
      }));

      return sendSuccess(res, { employmentTypes: employmentTypesWithAudit }, 'Employment types retrieved successfully');
    }

    return sendSuccess(res, { employmentTypes }, 'Employment types retrieved successfully');
  } catch (error) {
    console.error('Get employment types error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get employment type by ID
 * GET /api/:orgSlug/masters/employment-types/:id
 */
export const getEmploymentTypeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const employmentType = await prisma.employmentType.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!employmentType) {
      return sendError(res, 'Employment type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (employmentType.createdBy) userIds.push(employmentType.createdBy);
      if (employmentType.updatedBy) userIds.push(employmentType.updatedBy);

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

      const employmentTypeWithAudit = {
        ...employmentType,
        creator: employmentType.createdBy ? userMap.get(employmentType.createdBy) : null,
        updater: employmentType.updatedBy ? userMap.get(employmentType.updatedBy) : null,
      };

      return sendSuccess(res, { employmentType: employmentTypeWithAudit }, 'Employment type retrieved successfully');
    }

    return sendSuccess(res, { employmentType }, 'Employment type retrieved successfully');
  } catch (error) {
    console.error('Get employment type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create employment type
 * POST /api/:orgSlug/masters/employment-types
 */
export const createEmploymentType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { name, code, description, isActive } = req.body;

    // Validation
    if (!name) {
      return sendError(res, 'Name is required', STATUS_CODES.BAD_REQUEST);
    }

    // Check if code already exists for this organization
    if (code) {
      const existing = await prisma.employmentType.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (existing) {
        return sendError(
          res,
          'Employment type with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const employmentType = await prisma.employmentType.create({
      data: {
        name,
        code: code ? code.toUpperCase() : null,
        description,
        organizationId,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { employmentType }, 'Employment type created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create employment type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update employment type
 * PUT /api/:orgSlug/masters/employment-types/:id
 */
export const updateEmploymentType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    // Check if employment type exists and belongs to this organization
    const existing = await prisma.employmentType.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existing) {
      return sendError(res, 'Employment type not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.employmentType.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (duplicate) {
        return sendError(
          res,
          'Employment type with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const employmentType = await prisma.employmentType.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { employmentType }, 'Employment type updated successfully');
  } catch (error) {
    console.error('Update employment type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete employment type
 * DELETE /api/:orgSlug/masters/employment-types/:id
 */
export const deleteEmploymentType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if employment type exists and belongs to this organization
    const existing = await prisma.employmentType.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        employees: true,
      },
    });

    if (!existing) {
      return sendError(res, 'Employment type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if employment type has employees
    if (existing.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete employment type with ${existing.employees.length} existing employees. Please reassign them first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.employmentType.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Employment type deleted successfully');
  } catch (error) {
    console.error('Delete employment type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
