import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all designations for the organization
 * GET /api/:orgSlug/masters/designations
 */
export const getAllDesignations = async (req: Request, res: Response): Promise<Response> => {
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

    const designations = await prisma.designation.findMany({
      where,
      orderBy: [
        { level: 'desc' }, // Higher level first (e.g., 10, 9, 8...)
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        level: true,
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
      // Fetch creator and updater details for all designations
      const userIds = new Set<number>();
      designations.forEach(item => {
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

      // Attach creator and updater details to each designation
      const designationsWithAudit = designations.map(item => ({
        ...item,
        creator: item.createdBy ? userMap.get(item.createdBy) : null,
        updater: item.updatedBy ? userMap.get(item.updatedBy) : null,
      }));

      return sendSuccess(res, { designations: designationsWithAudit }, 'Designations retrieved successfully');
    }

    // User doesn't have permission - return without audit info
    return sendSuccess(res, { designations }, 'Designations retrieved successfully');
  } catch (error) {
    console.error('Get designations error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get designation by ID
 * GET /api/:orgSlug/masters/designations/:id
 */
export const getDesignationById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const designation = await prisma.designation.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!designation) {
      return sendError(res, 'Designation not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      // Fetch creator and updater details
      const userIds: number[] = [];
      if (designation.createdBy) userIds.push(designation.createdBy);
      if (designation.updatedBy) userIds.push(designation.updatedBy);

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

      const designationWithAudit = {
        ...designation,
        creator: designation.createdBy ? userMap.get(designation.createdBy) : null,
        updater: designation.updatedBy ? userMap.get(designation.updatedBy) : null,
      };

      return sendSuccess(res, { designation: designationWithAudit }, 'Designation retrieved successfully');
    }

    // User doesn't have permission - return without audit info
    return sendSuccess(res, { designation }, 'Designation retrieved successfully');
  } catch (error) {
    console.error('Get designation error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create designation
 * POST /api/:orgSlug/masters/designations
 */
export const createDesignation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { name, code, description, level, isActive } = req.body;

    // Validation
    if (!name) {
      return sendError(res, 'Name is required', STATUS_CODES.BAD_REQUEST);
    }

    // Level validation (if provided)
    if (level !== undefined && level !== null) {
      if (typeof level !== 'number' || level < 0 || level > 10) {
        return sendError(
          res,
          'Level must be a number between 0 and 10',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Check if code already exists for this organization
    if (code) {
      const existing = await prisma.designation.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (existing) {
        return sendError(
          res,
          'Designation with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const designation = await prisma.designation.create({
      data: {
        name,
        code: code ? code.toUpperCase() : null,
        description,
        level: level !== undefined && level !== null ? level : null,
        organizationId,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { designation }, 'Designation created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create designation error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update designation
 * PUT /api/:orgSlug/masters/designations/:id
 */
export const updateDesignation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, description, level, isActive } = req.body;

    // Check if designation exists and belongs to this organization
    const existing = await prisma.designation.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existing) {
      return sendError(res, 'Designation not found', STATUS_CODES.NOT_FOUND);
    }

    // Level validation (if provided)
    if (level !== undefined && level !== null) {
      if (typeof level !== 'number' || level < 0 || level > 10) {
        return sendError(
          res,
          'Level must be a number between 0 and 10',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.designation.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (duplicate) {
        return sendError(
          res,
          'Designation with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const designation = await prisma.designation.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(level !== undefined && { level }),
        ...(isActive !== undefined && { isActive }),
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { designation }, 'Designation updated successfully');
  } catch (error) {
    console.error('Update designation error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete designation
 * DELETE /api/:orgSlug/masters/designations/:id
 */
export const deleteDesignation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if designation exists and belongs to this organization
    const existing = await prisma.designation.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        employees: true,
      },
    });

    if (!existing) {
      return sendError(res, 'Designation not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if designation has employees
    if (existing.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete designation with ${existing.employees.length} existing employees. Please reassign them first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.designation.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Designation deleted successfully');
  } catch (error) {
    console.error('Delete designation error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
