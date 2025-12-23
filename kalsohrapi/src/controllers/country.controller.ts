import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all countries
 * GET /api/superadmin/masters/countries
 * GET /api/:orgSlug/masters/countries (read-only for orgs)
 */
export const getAllCountries = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const countries = await prisma.country.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        iso2: true,
        phoneCode: true,
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
      // Fetch creator and updater details for all countries
      const userIds = new Set<number>();
      countries.forEach(country => {
        if (country.createdBy) userIds.add(country.createdBy);
        if (country.updatedBy) userIds.add(country.updatedBy);
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

      // Attach creator and updater details to each country
      const countriesWithAudit = countries.map(country => ({
        ...country,
        creator: country.createdBy ? userMap.get(country.createdBy) : null,
        updater: country.updatedBy ? userMap.get(country.updatedBy) : null,
      }));

      return sendSuccess(res, { countries: countriesWithAudit }, 'Countries retrieved successfully');
    }

    // User doesn't have permission - return without audit info
    return sendSuccess(res, { countries }, 'Countries retrieved successfully');
  } catch (error) {
    console.error('Get countries error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get country by ID
 * GET /api/superadmin/masters/countries/:id
 */
export const getCountryById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const country = await prisma.country.findUnique({
      where: { id: parseInt(id) },
      include: {
        states: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!country) {
      return sendError(res, 'Country not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      // Fetch creator and updater details
      const userIds: number[] = [];
      if (country.createdBy) userIds.push(country.createdBy);
      if (country.updatedBy) userIds.push(country.updatedBy);

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

      const countryWithAudit = {
        ...country,
        creator: country.createdBy ? userMap.get(country.createdBy) : null,
        updater: country.updatedBy ? userMap.get(country.updatedBy) : null,
      };

      return sendSuccess(res, { country: countryWithAudit }, 'Country retrieved successfully');
    }

    // User doesn't have permission - return without audit info
    return sendSuccess(res, { country }, 'Country retrieved successfully');
  } catch (error) {
    console.error('Get country error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create country
 * POST /api/superadmin/masters/countries
 */
export const createCountry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, iso2, phoneCode, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code || !iso2 || !phoneCode) {
      return sendError(res, 'Name, code, iso2, and phoneCode are required', STATUS_CODES.BAD_REQUEST);
    }

    // Check if country code already exists
    const existing = await prisma.country.findUnique({
      where: { code },
    });

    if (existing) {
      return sendError(res, 'Country with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const country = await prisma.country.create({
      data: {
        name,
        code: code.toUpperCase(),
        iso2: iso2.toUpperCase(),
        phoneCode,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { country }, 'Country created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create country error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update country
 * PUT /api/superadmin/masters/countries/:id
 */
export const updateCountry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, iso2, phoneCode, isActive, displayOrder } = req.body;

    // Check if country exists
    const existing = await prisma.country.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return sendError(res, 'Country not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existing.code) {
      const duplicate = await prisma.country.findUnique({
        where: { code },
      });

      if (duplicate) {
        return sendError(res, 'Country with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const country = await prisma.country.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(iso2 && { iso2: iso2.toUpperCase() }),
        ...(phoneCode && { phoneCode }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder }),
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { country }, 'Country updated successfully');
  } catch (error) {
    console.error('Update country error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete country
 * DELETE /api/superadmin/masters/countries/:id
 */
export const deleteCountry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if country exists
    const existing = await prisma.country.findUnique({
      where: { id: parseInt(id) },
      include: {
        states: true,
      },
    });

    if (!existing) {
      return sendError(res, 'Country not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if country has states
    if (existing.states.length > 0) {
      return sendError(
        res,
        'Cannot delete country with existing states. Delete states first.',
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.country.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Country deleted successfully');
  } catch (error) {
    console.error('Delete country error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
