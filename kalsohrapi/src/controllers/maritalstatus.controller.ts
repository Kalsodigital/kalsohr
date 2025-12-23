import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all marital statuses
 * GET /api/superadmin/masters/marital-status
 * GET /api/:orgSlug/masters/marital-status (read-only for orgs)
 */
export const getAllMaritalStatuses = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const maritalStatuses = await prisma.maritalStatus.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
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
      maritalStatuses.forEach(status => {
        if (status.createdBy) userIds.add(status.createdBy);
        if (status.updatedBy) userIds.add(status.updatedBy);
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

      const maritalStatusesWithAudit = maritalStatuses.map(status => ({
        ...status,
        creator: status.createdBy ? userMap.get(status.createdBy) : null,
        updater: status.updatedBy ? userMap.get(status.updatedBy) : null,
      }));

      return sendSuccess(res, { maritalStatuses: maritalStatusesWithAudit }, 'Marital statuses retrieved successfully');
    }

    return sendSuccess(res, { maritalStatuses }, 'Marital statuses retrieved successfully');
  } catch (error) {
    console.error('Get marital statuses error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get marital status by ID
 * GET /api/superadmin/masters/marital-status/:id
 */
export const getMaritalStatusById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const maritalStatus = await prisma.maritalStatus.findUnique({
      where: { id: parseInt(id) },
    });

    if (!maritalStatus) {
      return sendError(res, 'Marital status not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (maritalStatus.createdBy) userIds.push(maritalStatus.createdBy);
      if (maritalStatus.updatedBy) userIds.push(maritalStatus.updatedBy);

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

      const maritalStatusWithAudit = {
        ...maritalStatus,
        creator: maritalStatus.createdBy ? userMap.get(maritalStatus.createdBy) : null,
        updater: maritalStatus.updatedBy ? userMap.get(maritalStatus.updatedBy) : null,
      };

      return sendSuccess(res, { maritalStatus: maritalStatusWithAudit }, 'Marital status retrieved successfully');
    }

    return sendSuccess(res, { maritalStatus }, 'Marital status retrieved successfully');
  } catch (error) {
    console.error('Get marital status error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new marital status
 * POST /api/superadmin/masters/marital-status
 */
export const createMaritalStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    // Check for duplicate code
    const existingMaritalStatus = await prisma.maritalStatus.findUnique({
      where: { code },
    });

    if (existingMaritalStatus) {
      return sendError(res, 'Marital status with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const maritalStatus = await prisma.maritalStatus.create({
      data: {
        name,
        code: code.toUpperCase(),
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { maritalStatus }, 'Marital status created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create marital status error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update marital status
 * PUT /api/superadmin/masters/marital-status/:id
 */
export const updateMaritalStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, isActive, displayOrder } = req.body;

    // Check if marital status exists
    const existingMaritalStatus = await prisma.maritalStatus.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingMaritalStatus) {
      return sendError(res, 'Marital status not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingMaritalStatus.code) {
      const duplicateMaritalStatus = await prisma.maritalStatus.findUnique({
        where: { code },
      });

      if (duplicateMaritalStatus) {
        return sendError(res, 'Marital status with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const maritalStatus = await prisma.maritalStatus.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingMaritalStatus.name,
        code: code ? code.toUpperCase() : existingMaritalStatus.code,
        isActive: isActive !== undefined ? isActive : existingMaritalStatus.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingMaritalStatus.displayOrder,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { maritalStatus }, 'Marital status updated successfully');
  } catch (error) {
    console.error('Update marital status error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete marital status
 * DELETE /api/superadmin/masters/marital-status/:id
 */
export const deleteMaritalStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if marital status exists
    const existingMaritalStatus = await prisma.maritalStatus.findUnique({
      where: { id: parseInt(id) },
      include: { employees: true },
    });

    if (!existingMaritalStatus) {
      return sendError(res, 'Marital status not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if marital status is being used by any employees
    if (existingMaritalStatus.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete marital status. It is being used by ${existingMaritalStatus.employees.length} employee(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.maritalStatus.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Marital status deleted successfully');
  } catch (error) {
    console.error('Delete marital status error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
