import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES, ORG_STATUS } from '../config/constants';

/**
 * Tenant context middleware
 * Extracts organization slug from URL and validates organization
 * Adds organization context to request
 */
export const tenantContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { orgSlug } = req.params;

    if (!orgSlug) {
      return sendError(
        res,
        'Organization slug is required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Fetch organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionPlanId: true,
        isActive: true,
        status: true,
        subscriptionExpiryDate: true,
      },
    });

    if (!organization) {
      return sendError(
        res,
        MESSAGES.ORG.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Check if organization is active
    if (!organization.isActive || organization.status !== ORG_STATUS.ACTIVE) {
      return sendError(
        res,
        organization.status === ORG_STATUS.SUSPENDED
          ? MESSAGES.ORG.SUSPENDED
          : MESSAGES.ORG.INACTIVE,
        STATUS_CODES.FORBIDDEN
      );
    }

    // Check subscription expiry
    if (organization.subscriptionExpiryDate && new Date(organization.subscriptionExpiryDate) < new Date()) {
      return sendError(
        res,
        MESSAGES.ORG.EXPIRED,
        STATUS_CODES.FORBIDDEN
      );
    }

    // Check if super admin is impersonating (support mode)
    const impersonateHeader = req.headers['x-impersonate-org'];
    const isImpersonating = req.user?.isSuperAdmin && impersonateHeader === orgSlug;

    console.log('=== Tenant Middleware Debug ===');
    console.log('orgSlug:', orgSlug);
    console.log('isSuperAdmin:', req.user?.isSuperAdmin);
    console.log('X-Impersonate-Org header:', impersonateHeader);
    console.log('isImpersonating:', isImpersonating);
    console.log('Platform role:', req.user?.role?.name);
    console.log('===============================');

    // Allow super admins ONLY when impersonating (support mode)
    if (req.user?.isSuperAdmin) {
      if (!isImpersonating) {
        return sendError(
          res,
          'Super admins cannot access organization portal. Please use the admin panel at /superadmin',
          STATUS_CODES.FORBIDDEN
        );
      }
      // Super admin is impersonating - mark this in request for permission checks
      // Permission middleware will check the super admin's platform role permissions
      (req as any).isImpersonating = true;
    } else {
      // Regular user must belong to this organization
      if (!req.user?.organizationId) {
        return sendError(
          res,
          'User does not belong to any organization',
          STATUS_CODES.FORBIDDEN
        );
      }

      if (req.user.organizationId !== organization.id) {
        return sendError(
          res,
          'You do not have access to this organization',
          STATUS_CODES.FORBIDDEN
        );
      }
    }

    // Attach organization to request
    req.organization = organization;
    req.organizationId = organization.id;

    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Check if module is enabled for organization
 */
export const checkModuleEnabled = (moduleCode: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      if (!req.organizationId) {
        return sendError(
          res,
          'Organization context is required',
          STATUS_CODES.BAD_REQUEST
        );
      }

      // Super admin bypasses module checks
      if (req.user?.isSuperAdmin) {
        return next();
      }

      // First, find the org module by code
      const moduleRecord = await prisma.orgModule.findUnique({
        where: { code: moduleCode },
      });

      if (!moduleRecord) {
        return sendError(
          res,
          MESSAGES.PERMISSION.MODULE_DISABLED,
          STATUS_CODES.FORBIDDEN
        );
      }

      // Check if module is enabled for this organization
      const orgModuleEnabled = await prisma.organizationModule.findUnique({
        where: {
          organizationId_orgModuleId: {
            organizationId: req.organizationId,
            orgModuleId: moduleRecord.id,
          },
        },
      });

      if (!orgModuleEnabled || !orgModuleEnabled.isEnabled) {
        return sendError(
          res,
          MESSAGES.PERMISSION.MODULE_DISABLED,
          STATUS_CODES.FORBIDDEN
        );
      }

      next();
    } catch (error) {
      console.error('Module check error:', error);
      return sendError(
        res,
        MESSAGES.GENERAL.ERROR,
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        error
      );
    }
  };
};
