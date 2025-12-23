import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

const VALID_HOLIDAY_TYPES = ['National', 'Religious', 'Company', 'Regional'];

/**
 * Get all holidays for the organization
 * GET /api/:orgSlug/masters/holidays?year=2024&month=1&type=National&isOptional=false
 */
export const getAllHolidays = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { year, month, type, isOptional, isActive } = req.query;

    const where: any = {
      organizationId,
    };

    // Filter by year
    if (year) {
      const yearNum = parseInt(year as string);
      where.date = {
        gte: new Date(`${yearNum}-01-01`),
        lte: new Date(`${yearNum}-12-31`),
      };
    }

    // Filter by month (requires year)
    if (month && year) {
      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by isOptional
    if (isOptional !== undefined) {
      where.isOptional = isOptional === 'true';
    }

    // Filter by isActive
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        name: true,
        description: true,
        type: true,
        isOptional: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      holidays.forEach(item => {
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

      const holidaysWithAudit = holidays.map(item => ({
        ...item,
        creator: item.createdBy ? userMap.get(item.createdBy) : null,
        updater: item.updatedBy ? userMap.get(item.updatedBy) : null,
      }));

      return sendSuccess(res, { holidays: holidaysWithAudit }, 'Holidays retrieved successfully');
    }

    return sendSuccess(res, { holidays }, 'Holidays retrieved successfully');
  } catch (error) {
    console.error('Get holidays error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get holiday by ID
 * GET /api/:orgSlug/masters/holidays/:id
 */
export const getHolidayById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const holiday = await prisma.holiday.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!holiday) {
      return sendError(res, 'Holiday not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (holiday.createdBy) userIds.push(holiday.createdBy);
      if (holiday.updatedBy) userIds.push(holiday.updatedBy);

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

      const holidayWithAudit = {
        ...holiday,
        creator: holiday.createdBy ? userMap.get(holiday.createdBy) : null,
        updater: holiday.updatedBy ? userMap.get(holiday.updatedBy) : null,
      };

      return sendSuccess(res, { holiday: holidayWithAudit }, 'Holiday retrieved successfully');
    }

    return sendSuccess(res, { holiday }, 'Holiday retrieved successfully');
  } catch (error) {
    console.error('Get holiday error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create holiday
 * POST /api/:orgSlug/masters/holidays
 */
export const createHoliday = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { date, name, description, type, isOptional, isActive } = req.body;

    // Validation
    if (!date) {
      return sendError(res, 'Date is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!name) {
      return sendError(res, 'Name is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!type) {
      return sendError(res, 'Type is required', STATUS_CODES.BAD_REQUEST);
    }

    // Validate type enum
    if (!VALID_HOLIDAY_TYPES.includes(type)) {
      return sendError(
        res,
        `Invalid holiday type. Must be one of: ${VALID_HOLIDAY_TYPES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Parse and validate date
    const holidayDate = new Date(date);
    if (isNaN(holidayDate.getTime())) {
      return sendError(res, 'Invalid date format', STATUS_CODES.BAD_REQUEST);
    }

    // Check if holiday already exists for this date
    const existing = await prisma.holiday.findUnique({
      where: {
        organizationId_date: {
          organizationId,
          date: holidayDate,
        },
      },
    });

    if (existing) {
      return sendError(
        res,
        'A holiday already exists for this date in your organization',
        STATUS_CODES.BAD_REQUEST
      );
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: holidayDate,
        name,
        description: description || null,
        type,
        isOptional: isOptional !== undefined ? isOptional : false,
        isActive: isActive !== undefined ? isActive : true,
        organizationId,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { holiday }, 'Holiday created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create holiday error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update holiday
 * PUT /api/:orgSlug/masters/holidays/:id
 */
export const updateHoliday = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { date, name, description, type, isOptional, isActive } = req.body;

    // Check if holiday exists and belongs to this organization
    const existing = await prisma.holiday.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existing) {
      return sendError(res, 'Holiday not found', STATUS_CODES.NOT_FOUND);
    }

    // Validate type if provided
    if (type && !VALID_HOLIDAY_TYPES.includes(type)) {
      return sendError(
        res,
        `Invalid holiday type. Must be one of: ${VALID_HOLIDAY_TYPES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // If date is being changed, check for duplicates
    if (date) {
      const newDate = new Date(date);
      if (isNaN(newDate.getTime())) {
        return sendError(res, 'Invalid date format', STATUS_CODES.BAD_REQUEST);
      }

      // Only check for duplicate if date is actually changing
      if (newDate.getTime() !== existing.date.getTime()) {
        const duplicate = await prisma.holiday.findUnique({
          where: {
            organizationId_date: {
              organizationId,
              date: newDate,
            },
          },
        });

        if (duplicate) {
          return sendError(
            res,
            'A holiday already exists for this date in your organization',
            STATUS_CODES.BAD_REQUEST
          );
        }
      }
    }

    const holiday = await prisma.holiday.update({
      where: { id: parseInt(id) },
      data: {
        ...(date && { date: new Date(date) }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(isOptional !== undefined && { isOptional }),
        ...(isActive !== undefined && { isActive }),
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { holiday }, 'Holiday updated successfully');
  } catch (error) {
    console.error('Update holiday error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete holiday
 * DELETE /api/:orgSlug/masters/holidays/:id
 */
export const deleteHoliday = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if holiday exists and belongs to this organization
    const existing = await prisma.holiday.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existing) {
      return sendError(res, 'Holiday not found', STATUS_CODES.NOT_FOUND);
    }

    await prisma.holiday.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Holiday deleted successfully');
  } catch (error) {
    console.error('Delete holiday error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
