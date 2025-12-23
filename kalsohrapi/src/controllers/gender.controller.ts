import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all genders
 * GET /api/superadmin/masters/genders
 * GET /api/:orgSlug/masters/genders (read-only for orgs)
 */
export const getAllGenders = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const genders = await prisma.gender.findMany({
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
      genders.forEach(gender => {
        if (gender.createdBy) userIds.add(gender.createdBy);
        if (gender.updatedBy) userIds.add(gender.updatedBy);
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

      const gendersWithAudit = genders.map(gender => ({
        ...gender,
        creator: gender.createdBy ? userMap.get(gender.createdBy) : null,
        updater: gender.updatedBy ? userMap.get(gender.updatedBy) : null,
      }));

      return sendSuccess(res, { genders: gendersWithAudit }, 'Genders retrieved successfully');
    }

    return sendSuccess(res, { genders }, 'Genders retrieved successfully');
  } catch (error) {
    console.error('Get genders error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get gender by ID
 * GET /api/superadmin/masters/genders/:id
 */
export const getGenderById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const gender = await prisma.gender.findUnique({
      where: { id: parseInt(id) },
    });

    if (!gender) {
      return sendError(res, 'Gender not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (gender.createdBy) userIds.push(gender.createdBy);
      if (gender.updatedBy) userIds.push(gender.updatedBy);

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

      const genderWithAudit = {
        ...gender,
        creator: gender.createdBy ? userMap.get(gender.createdBy) : null,
        updater: gender.updatedBy ? userMap.get(gender.updatedBy) : null,
      };

      return sendSuccess(res, { gender: genderWithAudit }, 'Gender retrieved successfully');
    }

    return sendSuccess(res, { gender }, 'Gender retrieved successfully');
  } catch (error) {
    console.error('Get gender error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new gender
 * POST /api/superadmin/masters/genders
 */
export const createGender = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    // Check for duplicate code
    const existingGender = await prisma.gender.findUnique({
      where: { code },
    });

    if (existingGender) {
      return sendError(res, 'Gender with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const gender = await prisma.gender.create({
      data: {
        name,
        code: code.toUpperCase(),
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { gender }, 'Gender created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create gender error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update gender
 * PUT /api/superadmin/masters/genders/:id
 */
export const updateGender = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, isActive, displayOrder } = req.body;

    // Check if gender exists
    const existingGender = await prisma.gender.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingGender) {
      return sendError(res, 'Gender not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingGender.code) {
      const duplicateGender = await prisma.gender.findUnique({
        where: { code },
      });

      if (duplicateGender) {
        return sendError(res, 'Gender with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const gender = await prisma.gender.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingGender.name,
        code: code ? code.toUpperCase() : existingGender.code,
        isActive: isActive !== undefined ? isActive : existingGender.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingGender.displayOrder,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { gender }, 'Gender updated successfully');
  } catch (error) {
    console.error('Update gender error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete gender
 * DELETE /api/superadmin/masters/genders/:id
 */
export const deleteGender = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if gender exists
    const existingGender = await prisma.gender.findUnique({
      where: { id: parseInt(id) },
      include: { employees: true },
    });

    if (!existingGender) {
      return sendError(res, 'Gender not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if gender is being used by any employees
    if (existingGender.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete gender. It is being used by ${existingGender.employees.length} employee(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.gender.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Gender deleted successfully');
  } catch (error) {
    console.error('Delete gender error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
