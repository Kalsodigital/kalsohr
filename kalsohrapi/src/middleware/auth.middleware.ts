import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(
        res,
        MESSAGES.AUTH.UNAUTHORIZED,
        STATUS_CODES.UNAUTHORIZED
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return sendError(
        res,
        MESSAGES.AUTH.TOKEN_INVALID,
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    return sendError(
      res,
      MESSAGES.AUTH.UNAUTHORIZED,
      STATUS_CODES.UNAUTHORIZED,
      error
    );
  }
};

/**
 * Super admin only middleware
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  if (!req.user?.isSuperAdmin) {
    return sendError(
      res,
      MESSAGES.PERMISSION.DENIED,
      STATUS_CODES.FORBIDDEN
    );
  }

  next();
};

/**
 * Organization member only middleware
 * User must belong to an organization (not super admin)
 */
export const requireOrgMember = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  if (!req.user?.organizationId) {
    return sendError(
      res,
      'You must be a member of an organization to access this resource',
      STATUS_CODES.FORBIDDEN
    );
  }

  next();
};
