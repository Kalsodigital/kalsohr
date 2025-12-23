import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all states
 * GET /api/superadmin/masters/states
 * GET /api/:orgSlug/masters/states (read-only for orgs)
 */
export const getAllStates = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { countryId, isActive } = req.query;

    const where: any = {};
    if (countryId) {
      where.countryId = parseInt(countryId as string);
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const states = await prisma.state.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        countryId: true,
        name: true,
        code: true,
        type: true,
        isActive: true,
        displayOrder: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      states.forEach(state => {
        if (state.createdBy) userIds.add(state.createdBy);
        if (state.updatedBy) userIds.add(state.updatedBy);
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

      const statesWithAudit = states.map(state => ({
        ...state,
        creator: state.createdBy ? userMap.get(state.createdBy) : null,
        updater: state.updatedBy ? userMap.get(state.updatedBy) : null,
      }));

      return sendSuccess(res, { states: statesWithAudit }, 'States retrieved successfully');
    }

    return sendSuccess(res, { states }, 'States retrieved successfully');
  } catch (error) {
    console.error('Get states error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get state by ID
 * GET /api/superadmin/masters/states/:id
 */
export const getStateById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const state = await prisma.state.findUnique({
      where: { id: parseInt(id) },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!state) {
      return sendError(res, 'State not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (state.createdBy) userIds.push(state.createdBy);
      if (state.updatedBy) userIds.push(state.updatedBy);

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

      const stateWithAudit = {
        ...state,
        creator: state.createdBy ? userMap.get(state.createdBy) : null,
        updater: state.updatedBy ? userMap.get(state.updatedBy) : null,
      };

      return sendSuccess(res, { state: stateWithAudit }, 'State retrieved successfully');
    }

    return sendSuccess(res, { state }, 'State retrieved successfully');
  } catch (error) {
    console.error('Get state error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create state
 * POST /api/superadmin/masters/states
 */
export const createState = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { countryId, name, code, type, isActive, displayOrder } = req.body;

    // Validation
    if (!countryId || !name || !code) {
      return sendError(res, 'Country ID, name, and code are required', STATUS_CODES.BAD_REQUEST);
    }

    // Check if country exists
    const country = await prisma.country.findUnique({
      where: { id: parseInt(countryId) },
    });

    if (!country) {
      return sendError(res, 'Country not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if state code already exists for this country
    const existing = await prisma.state.findUnique({
      where: {
        countryId_code: {
          countryId: parseInt(countryId),
          code: code.toUpperCase(),
        },
      },
    });

    if (existing) {
      return sendError(res, 'State with this code already exists for this country', STATUS_CODES.BAD_REQUEST);
    }

    const state = await prisma.state.create({
      data: {
        countryId: parseInt(countryId),
        name,
        code: code.toUpperCase(),
        type: type || 'State',
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return sendSuccess(res, { state }, 'State created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create state error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update state
 * PUT /api/superadmin/masters/states/:id
 */
export const updateState = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, type, isActive, displayOrder } = req.body;

    // Check if state exists
    const existing = await prisma.state.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return sendError(res, 'State not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existing.code) {
      const duplicate = await prisma.state.findUnique({
        where: {
          countryId_code: {
            countryId: existing.countryId,
            code: code.toUpperCase(),
          },
        },
      });

      if (duplicate) {
        return sendError(res, 'State with this code already exists for this country', STATUS_CODES.BAD_REQUEST);
      }
    }

    const state = await prisma.state.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder }),
        updatedBy: userId,
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return sendSuccess(res, { state }, 'State updated successfully');
  } catch (error) {
    console.error('Update state error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete state
 * DELETE /api/superadmin/masters/states/:id
 */
export const deleteState = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if state exists
    const existing = await prisma.state.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return sendError(res, 'State not found', STATUS_CODES.NOT_FOUND);
    }

    await prisma.state.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'State deleted successfully');
  } catch (error) {
    console.error('Delete state error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
