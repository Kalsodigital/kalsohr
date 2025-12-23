import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all education levels
 * GET /api/superadmin/masters/education-levels
 * GET /api/:orgSlug/masters/education-levels (read-only for orgs)
 */
export const getAllEducationLevels = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const educationLevels = await prisma.educationLevel.findMany({
      where: whereClause,
      orderBy: [
        { level: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        code: true,
        level: true,
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
      educationLevels.forEach(eduLevel => {
        if (eduLevel.createdBy) userIds.add(eduLevel.createdBy);
        if (eduLevel.updatedBy) userIds.add(eduLevel.updatedBy);
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

      const educationLevelsWithAudit = educationLevels.map(eduLevel => ({
        ...eduLevel,
        creator: eduLevel.createdBy ? userMap.get(eduLevel.createdBy) : null,
        updater: eduLevel.updatedBy ? userMap.get(eduLevel.updatedBy) : null,
      }));

      return sendSuccess(res, { educationLevels: educationLevelsWithAudit }, 'Education levels retrieved successfully');
    }

    return sendSuccess(res, { educationLevels }, 'Education levels retrieved successfully');
  } catch (error) {
    console.error('Get education levels error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get education level by ID
 * GET /api/superadmin/masters/education-levels/:id
 */
export const getEducationLevelById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const educationLevel = await prisma.educationLevel.findUnique({
      where: { id: parseInt(id) },
    });

    if (!educationLevel) {
      return sendError(res, 'Education level not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (educationLevel.createdBy) userIds.push(educationLevel.createdBy);
      if (educationLevel.updatedBy) userIds.push(educationLevel.updatedBy);

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

      const educationLevelWithAudit = {
        ...educationLevel,
        creator: educationLevel.createdBy ? userMap.get(educationLevel.createdBy) : null,
        updater: educationLevel.updatedBy ? userMap.get(educationLevel.updatedBy) : null,
      };

      return sendSuccess(res, { educationLevel: educationLevelWithAudit }, 'Education level retrieved successfully');
    }

    return sendSuccess(res, { educationLevel }, 'Education level retrieved successfully');
  } catch (error) {
    console.error('Get education level error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new education level
 * POST /api/superadmin/masters/education-levels
 */
export const createEducationLevel = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, level, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    if (level === undefined) {
      return sendError(res, 'Level is required', STATUS_CODES.BAD_REQUEST);
    }

    // Check for duplicate code
    const existingEducationLevel = await prisma.educationLevel.findUnique({
      where: { code },
    });

    if (existingEducationLevel) {
      return sendError(res, 'Education level with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const educationLevel = await prisma.educationLevel.create({
      data: {
        name,
        code: code.toUpperCase(),
        level,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { educationLevel }, 'Education level created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create education level error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update education level
 * PUT /api/superadmin/masters/education-levels/:id
 */
export const updateEducationLevel = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, level, isActive, displayOrder } = req.body;

    // Check if education level exists
    const existingEducationLevel = await prisma.educationLevel.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingEducationLevel) {
      return sendError(res, 'Education level not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingEducationLevel.code) {
      const duplicateEducationLevel = await prisma.educationLevel.findUnique({
        where: { code },
      });

      if (duplicateEducationLevel) {
        return sendError(res, 'Education level with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const educationLevel = await prisma.educationLevel.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingEducationLevel.name,
        code: code ? code.toUpperCase() : existingEducationLevel.code,
        level: level !== undefined ? level : existingEducationLevel.level,
        isActive: isActive !== undefined ? isActive : existingEducationLevel.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingEducationLevel.displayOrder,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { educationLevel }, 'Education level updated successfully');
  } catch (error) {
    console.error('Update education level error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete education level
 * DELETE /api/superadmin/masters/education-levels/:id
 */
export const deleteEducationLevel = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if education level exists
    const existingEducationLevel = await prisma.educationLevel.findUnique({
      where: { id: parseInt(id) },
      include: { employees: true },
    });

    if (!existingEducationLevel) {
      return sendError(res, 'Education level not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if education level is being used by any employees
    if (existingEducationLevel.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete education level. It is being used by ${existingEducationLevel.employees.length} employee(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.educationLevel.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Education level deleted successfully');
  } catch (error) {
    console.error('Delete education level error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
