import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES } from '../config/constants';

/**
 * Get all platform modules (SuperAdmin only)
 * GET /api/superadmin/platform-modules
 */
export const getPlatformModules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const modules = await prisma.platformModule.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return sendSuccess(res, { modules }, 'Platform modules retrieved successfully');
  } catch (error) {
    console.error('Get platform modules error:', error);
    return sendError(
      res,
      'Failed to retrieve platform modules',
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get all org modules (SuperAdmin only)
 * GET /api/superadmin/org-modules
 */
export const getOrgModules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const modules = await prisma.orgModule.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    return sendSuccess(res, { modules }, 'Org modules retrieved successfully');
  } catch (error) {
    console.error('Get org modules error:', error);
    return sendError(
      res,
      'Failed to retrieve org modules',
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get modules for a subscription plan
 * GET /api/superadmin/subscription-plans/:planId/modules
 */
export const getPlanModules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { planId } = req.params;

    // Check if plan exists
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: Number(planId) },
    });

    if (!plan) {
      return sendError(res, 'Subscription plan not found', STATUS_CODES.NOT_FOUND);
    }

    // Get all org modules with plan assignment status
    const allOrgModules = await prisma.orgModule.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Get assigned modules for this plan
    const planModules = await prisma.planModule.findMany({
      where: { subscriptionPlanId: Number(planId) },
      select: { orgModuleId: true },
    });

    const assignedModuleIds = new Set(planModules.map((pm) => pm.orgModuleId));

    // Return all modules with assignment status
    const modulesWithStatus = allOrgModules.map((module) => ({
      ...module,
      isAssigned: assignedModuleIds.has(module.id),
    }));

    return sendSuccess(
      res,
      { plan, modules: modulesWithStatus },
      'Plan modules retrieved successfully'
    );
  } catch (error) {
    console.error('Get plan modules error:', error);
    return sendError(
      res,
      'Failed to retrieve plan modules',
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Update modules for a subscription plan
 * PUT /api/superadmin/subscription-plans/:planId/modules
 * Body: { moduleIds: number[] }
 */
export const updatePlanModules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { planId } = req.params;
    const { moduleIds } = req.body;

    if (!moduleIds || !Array.isArray(moduleIds)) {
      return sendError(res, 'moduleIds array is required', STATUS_CODES.BAD_REQUEST);
    }

    // Check if plan exists
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: Number(planId) },
    });

    if (!plan) {
      return sendError(res, 'Subscription plan not found', STATUS_CODES.NOT_FOUND);
    }

    // Validate all module IDs exist
    const validModules = await prisma.orgModule.findMany({
      where: { id: { in: moduleIds.map(Number) } },
    });

    if (validModules.length !== moduleIds.length) {
      return sendError(res, 'One or more module IDs are invalid', STATUS_CODES.BAD_REQUEST);
    }

    // Ensure all core modules are included
    const coreModules = await prisma.orgModule.findMany({
      where: { isCore: true },
    });

    const coreModuleIds = coreModules.map((m) => m.id);
    const missingCoreModules = coreModuleIds.filter(
      (id) => !moduleIds.map(Number).includes(id)
    );

    if (missingCoreModules.length > 0) {
      const missingNames = coreModules
        .filter((m) => missingCoreModules.includes(m.id))
        .map((m) => m.name)
        .join(', ');
      return sendError(
        res,
        `Core modules cannot be removed: ${missingNames}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Delete existing plan modules
    await prisma.planModule.deleteMany({
      where: { subscriptionPlanId: Number(planId) },
    });

    // Create new plan modules
    await prisma.planModule.createMany({
      data: moduleIds.map((id: number) => ({
        subscriptionPlanId: Number(planId),
        orgModuleId: Number(id),
      })),
    });

    // Get updated modules
    const updatedPlanModules = await prisma.planModule.findMany({
      where: { subscriptionPlanId: Number(planId) },
      include: { orgModule: true },
    });

    return sendSuccess(
      res,
      { planModules: updatedPlanModules },
      'Plan modules updated successfully'
    );
  } catch (error) {
    console.error('Update plan modules error:', error);
    return sendError(
      res,
      'Failed to update plan modules',
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get modules enabled for an organization
 * GET /api/superadmin/organizations/:orgId/modules
 */
export const getOrganizationModules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { orgId } = req.params;

    // Get organization with plan
    const org = await prisma.organization.findUnique({
      where: { id: Number(orgId) },
      include: {
        subscriptionPlan: {
          include: {
            planModules: {
              include: { orgModule: true },
            },
          },
        },
      },
    });

    if (!org) {
      return sendError(res, 'Organization not found', STATUS_CODES.NOT_FOUND);
    }

    // Get enabled/disabled status for each plan module
    const orgModules = await prisma.organizationModule.findMany({
      where: { organizationId: Number(orgId) },
      include: { orgModule: true },
    });

    const orgModuleMap = new Map(
      orgModules.map((om) => [om.orgModuleId, om])
    );

    // Build response with plan modules and their enabled status
    const planModules = org.subscriptionPlan?.planModules || [];
    const modulesWithStatus = planModules.map((pm) => {
      const orgModule = orgModuleMap.get(pm.orgModuleId);
      return {
        ...pm.orgModule,
        isEnabled: orgModule?.isEnabled ?? true, // Default enabled if not explicitly set
        canDisable: !pm.orgModule.isCore, // Core modules cannot be disabled
      };
    });

    return sendSuccess(
      res,
      { organization: org, modules: modulesWithStatus },
      'Organization modules retrieved successfully'
    );
  } catch (error) {
    console.error('Get organization modules error:', error);
    return sendError(
      res,
      'Failed to retrieve organization modules',
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Update module enabled status for an organization
 * PUT /api/superadmin/organizations/:orgId/modules
 * Body: { modules: [{ orgModuleId: number, isEnabled: boolean }] }
 */
export const updateOrganizationModules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { orgId } = req.params;
    const { modules } = req.body;

    if (!modules || !Array.isArray(modules)) {
      return sendError(res, 'modules array is required', STATUS_CODES.BAD_REQUEST);
    }

    // Get organization with plan
    const org = await prisma.organization.findUnique({
      where: { id: Number(orgId) },
      include: {
        subscriptionPlan: {
          include: {
            planModules: {
              include: { orgModule: true },
            },
          },
        },
      },
    });

    if (!org) {
      return sendError(res, 'Organization not found', STATUS_CODES.NOT_FOUND);
    }

    // Get plan module IDs
    const planModuleIds = new Set(
      org.subscriptionPlan?.planModules.map((pm) => pm.orgModuleId) || []
    );

    // Validate and process each module
    for (const mod of modules) {
      const { orgModuleId, isEnabled } = mod;

      // Check if module is part of the plan
      if (!planModuleIds.has(orgModuleId)) {
        return sendError(
          res,
          `Module ${orgModuleId} is not part of the organization's plan`,
          STATUS_CODES.BAD_REQUEST
        );
      }

      // Check if trying to disable a core module
      if (!isEnabled) {
        const orgModule = await prisma.orgModule.findUnique({
          where: { id: orgModuleId },
        });
        if (orgModule?.isCore) {
          return sendError(
            res,
            `Cannot disable core module: ${orgModule.name}`,
            STATUS_CODES.BAD_REQUEST
          );
        }
      }

      // Upsert organization module
      await prisma.organizationModule.upsert({
        where: {
          organizationId_orgModuleId: {
            organizationId: Number(orgId),
            orgModuleId: orgModuleId,
          },
        },
        update: {
          isEnabled,
          disabledAt: isEnabled ? null : new Date(),
        },
        create: {
          organizationId: Number(orgId),
          orgModuleId: orgModuleId,
          isEnabled,
          disabledAt: isEnabled ? null : new Date(),
        },
      });
    }

    // Return updated modules
    const updatedModules = await prisma.organizationModule.findMany({
      where: { organizationId: Number(orgId) },
      include: { orgModule: true },
    });

    return sendSuccess(
      res,
      { modules: updatedModules },
      'Organization modules updated successfully'
    );
  } catch (error) {
    console.error('Update organization modules error:', error);
    return sendError(
      res,
      'Failed to update organization modules',
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};
