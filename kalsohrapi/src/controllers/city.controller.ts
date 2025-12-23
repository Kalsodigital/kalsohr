import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all cities
 * GET /api/superadmin/masters/cities
 * GET /api/:orgSlug/masters/cities (read-only for orgs)
 */
export const getAllCities = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive, stateId, countryId, type } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (stateId) {
      whereClause.stateId = parseInt(stateId as string);
    }

    if (countryId) {
      whereClause.state = {
        countryId: parseInt(countryId as string),
      };
    }

    if (type) {
      whereClause.type = type;
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const cities = await prisma.city.findMany({
      where: whereClause,
      select: {
        id: true,
        stateId: true,
        name: true,
        code: true,
        type: true,
        isActive: true,
        displayOrder: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        state: {
          select: {
            id: true,
            name: true,
            code: true,
            countryId: true,
            country: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      cities.forEach(city => {
        if (city.createdBy) userIds.add(city.createdBy);
        if (city.updatedBy) userIds.add(city.updatedBy);
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

      const citiesWithAudit = cities.map(city => ({
        ...city,
        creator: city.createdBy ? userMap.get(city.createdBy) : null,
        updater: city.updatedBy ? userMap.get(city.updatedBy) : null,
      }));

      return sendSuccess(res, { cities: citiesWithAudit }, 'Cities retrieved successfully');
    }

    return sendSuccess(res, { cities }, 'Cities retrieved successfully');
  } catch (error) {
    console.error('Get cities error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get city by ID
 * GET /api/superadmin/masters/cities/:id
 */
export const getCityById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const city = await prisma.city.findUnique({
      where: { id: parseInt(id) },
      include: {
        state: {
          include: {
            country: true,
          },
        },
      },
    });

    if (!city) {
      return sendError(res, 'City not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (city.createdBy) userIds.push(city.createdBy);
      if (city.updatedBy) userIds.push(city.updatedBy);

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

      const cityWithAudit = {
        ...city,
        creator: city.createdBy ? userMap.get(city.createdBy) : null,
        updater: city.updatedBy ? userMap.get(city.updatedBy) : null,
      };

      return sendSuccess(res, { city: cityWithAudit }, 'City retrieved successfully');
    }

    return sendSuccess(res, { city }, 'City retrieved successfully');
  } catch (error) {
    console.error('Get city error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new city
 * POST /api/superadmin/masters/cities
 */
export const createCity = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { stateId, name, code, type, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    if (!stateId) {
      return sendError(res, 'State ID is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!type) {
      return sendError(res, 'Type is required', STATUS_CODES.BAD_REQUEST);
    }

    // Validate type
    const validTypes = ['City', 'District', 'Town'];
    if (!validTypes.includes(type)) {
      return sendError(res, `Type must be one of: ${validTypes.join(', ')}`, STATUS_CODES.BAD_REQUEST);
    }

    // Check if state exists
    const state = await prisma.state.findUnique({
      where: { id: stateId },
    });

    if (!state) {
      return sendError(res, 'State not found', STATUS_CODES.NOT_FOUND);
    }

    // Check for duplicate code within the same state
    const existingCity = await prisma.city.findFirst({
      where: {
        stateId,
        code: code.toUpperCase(),
      },
    });

    if (existingCity) {
      return sendError(res, 'City with this code already exists in this state', STATUS_CODES.BAD_REQUEST);
    }

    const city = await prisma.city.create({
      data: {
        stateId,
        name,
        code: code.toUpperCase(),
        type,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        state: {
          include: {
            country: true,
          },
        },
      },
    });

    return sendSuccess(res, { city }, 'City created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create city error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update city
 * PUT /api/superadmin/masters/cities/:id
 */
export const updateCity = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { stateId, name, code, type, isActive, displayOrder } = req.body;

    // Check if city exists
    const existingCity = await prisma.city.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingCity) {
      return sendError(res, 'City not found', STATUS_CODES.NOT_FOUND);
    }

    // If stateId is being changed, check if state exists
    if (stateId && stateId !== existingCity.stateId) {
      const state = await prisma.state.findUnique({
        where: { id: stateId },
      });

      if (!state) {
        return sendError(res, 'State not found', STATUS_CODES.NOT_FOUND);
      }
    }

    // Validate type if provided
    if (type) {
      const validTypes = ['City', 'District', 'Town'];
      if (!validTypes.includes(type)) {
        return sendError(res, `Type must be one of: ${validTypes.join(', ')}`, STATUS_CODES.BAD_REQUEST);
      }
    }

    // If code or stateId is being changed, check for duplicates
    const newStateId = stateId || existingCity.stateId;
    const newCode = code ? code.toUpperCase() : existingCity.code;

    if (code !== existingCity.code || stateId !== existingCity.stateId) {
      const duplicateCity = await prisma.city.findFirst({
        where: {
          stateId: newStateId,
          code: newCode,
          NOT: {
            id: parseInt(id),
          },
        },
      });

      if (duplicateCity) {
        return sendError(res, 'City with this code already exists in this state', STATUS_CODES.BAD_REQUEST);
      }
    }

    const city = await prisma.city.update({
      where: { id: parseInt(id) },
      data: {
        stateId: stateId || existingCity.stateId,
        name: name || existingCity.name,
        code: code ? code.toUpperCase() : existingCity.code,
        type: type || existingCity.type,
        isActive: isActive !== undefined ? isActive : existingCity.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingCity.displayOrder,
        updatedBy: userId,
      },
      include: {
        state: {
          include: {
            country: true,
          },
        },
      },
    });

    return sendSuccess(res, { city }, 'City updated successfully');
  } catch (error) {
    console.error('Update city error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete city
 * DELETE /api/superadmin/masters/cities/:id
 */
export const deleteCity = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if city exists
    const existingCity = await prisma.city.findUnique({
      where: { id: parseInt(id) },
      include: { employees: true },
    });

    if (!existingCity) {
      return sendError(res, 'City not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if city is being used by any employees
    if (existingCity.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete city. It is being used by ${existingCity.employees.length} employee(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.city.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'City deleted successfully');
  } catch (error) {
    console.error('Delete city error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
