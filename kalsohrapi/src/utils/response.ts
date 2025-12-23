import { Response } from 'express';
import { STATUS_CODES } from '../config/constants';

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: any;
  meta?: any;
}

/**
 * Send success response
 */
export const sendSuccess = (
  res: Response,
  data: any = null,
  message: string = 'Success',
  statusCode: number = STATUS_CODES.OK,
  meta?: any
): Response => {
  const response: ApiResponse = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta && { meta }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string = 'Error',
  statusCode: number = STATUS_CODES.INTERNAL_SERVER_ERROR,
  error?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error && { error }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginated = (
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Success'
): Response => {
  const totalPages = Math.ceil(total / limit);

  return sendSuccess(
    res,
    data,
    message,
    STATUS_CODES.OK,
    {
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }
  );
};

/**
 * Send validation error response
 */
export const sendValidationError = (res: Response, errors: any): Response => {
  return res.status(STATUS_CODES.BAD_REQUEST).json({
    success: false,
    message: 'Validation error',
    errors,
  });
};
