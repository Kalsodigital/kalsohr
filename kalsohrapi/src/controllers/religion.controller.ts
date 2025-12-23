import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all religions
 * GET /api/superadmin/masters/religions
 * GET /api/:orgSlug/masters/religions (read-only for orgs)
 */
export const getAllReligions = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const religions = await prisma.religion.findMany({
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
      religions.forEach(religion => {
        if (religion.createdBy) userIds.add(religion.createdBy);
        if (religion.updatedBy) userIds.add(religion.updatedBy);
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

      const religionsWithAudit = religions.map(religion => ({
        ...religion,
        creator: religion.createdBy ? userMap.get(religion.createdBy) : null,
        updater: religion.updatedBy ? userMap.get(religion.updatedBy) : null,
      }));

      return sendSuccess(res, { religions: religionsWithAudit }, 'Religions retrieved successfully');
    }

    return sendSuccess(res, { religions }, 'Religions retrieved successfully');
  } catch (error) {
    console.error('Get religions error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get religion by ID
 * GET /api/superadmin/masters/religions/:id
 */
export const getReligionById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const religion = await prisma.religion.findUnique({
      where: { id: parseInt(id) },
    });

    if (!religion) {
      return sendError(res, 'Religion not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (religion.createdBy) userIds.push(religion.createdBy);
      if (religion.updatedBy) userIds.push(religion.updatedBy);

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

      const religionWithAudit = {
        ...religion,
        creator: religion.createdBy ? userMap.get(religion.createdBy) : null,
        updater: religion.updatedBy ? userMap.get(religion.updatedBy) : null,
      };

      return sendSuccess(res, { religion: religionWithAudit }, 'Religion retrieved successfully');
    }

    return sendSuccess(res, { religion }, 'Religion retrieved successfully');
  } catch (error) {
    console.error('Get religion error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new religion
 * POST /api/superadmin/masters/religions
 */
export const createReligion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    // Check for duplicate code
    const existingReligion = await prisma.religion.findUnique({
      where: { code },
    });

    if (existingReligion) {
      return sendError(res, 'Religion with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const religion = await prisma.religion.create({
      data: {
        name,
        code: code.toUpperCase(),
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { religion }, 'Religion created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create religion error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update religion
 * PUT /api/superadmin/masters/religions/:id
 */
export const updateReligion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, isActive, displayOrder } = req.body;

    // Check if religion exists
    const existingReligion = await prisma.religion.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingReligion) {
      return sendError(res, 'Religion not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingReligion.code) {
      const duplicateReligion = await prisma.religion.findUnique({
        where: { code },
      });

      if (duplicateReligion) {
        return sendError(res, 'Religion with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const religion = await prisma.religion.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingReligion.name,
        code: code ? code.toUpperCase() : existingReligion.code,
        isActive: isActive !== undefined ? isActive : existingReligion.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingReligion.displayOrder,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { religion }, 'Religion updated successfully');
  } catch (error) {
    console.error('Update religion error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete religion
 * DELETE /api/superadmin/masters/religions/:id
 */
export const deleteReligion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if religion exists
    const existingReligion = await prisma.religion.findUnique({
      where: { id: parseInt(id) },
      include: { employees: true },
    });

    if (!existingReligion) {
      return sendError(res, 'Religion not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if religion is being used by any employees
    if (existingReligion.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete religion. It is being used by ${existingReligion.employees.length} employee(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.religion.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Religion deleted successfully');
  } catch (error) {
    console.error('Delete religion error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
