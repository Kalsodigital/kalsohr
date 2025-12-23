import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES, ORG_STATUS } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all organizations (Super Admin only)
 * GET /api/superadmin/organizations
 */
export const getAllOrganizations = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const user = (req as any).user;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { slug: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'organizations');

    // Get organizations with pagination
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          slug: true,
          code: true,
          email: true,
          phone: true,
          address: true,
          countryId: true,
          stateId: true,
          cityId: true,
          postalCode: true,
          organizationTypeId: true,
          industryTypeId: true,
          businessCategoryId: true,
          subscriptionPlanId: true,
          subscriptionTenure: true,
          subscriptionStartDate: true,
          subscriptionExpiryDate: true,
          logo: true,
          isActive: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          createdBy: canViewAudit,
          updatedBy: canViewAudit,
          subscriptionPlan: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              users: true,
              employees: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.count({ where }),
    ]);

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      organizations.forEach(org => {
        if (org.createdBy) userIds.add(org.createdBy);
        if (org.updatedBy) userIds.add(org.updatedBy);
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

      const organizationsWithAudit = organizations.map(org => ({
        ...org,
        creator: org.createdBy ? userMap.get(org.createdBy) : null,
        updater: org.updatedBy ? userMap.get(org.updatedBy) : null,
      }));

      return sendSuccess(
        res,
        {
          organizations: organizationsWithAudit,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
        'Organizations retrieved successfully'
      );
    }

    return sendSuccess(
      res,
      {
        organizations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Organizations retrieved successfully'
    );
  } catch (error) {
    console.error('Get organizations error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get organization by ID (Super Admin only)
 * GET /api/superadmin/organizations/:id
 */
export const getOrganizationById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'organizations');

    const organization = await prisma.organization.findUnique({
      where: { id: Number(id) },
      include: {
        subscriptionPlan: true,
        organizationModules: true,
        organizationType: true,
        industryType: true,
        businessCategory: true,
        _count: {
          select: {
            users: true,
            employees: true,
            roles: true,
          },
        },
      },
    });

    if (!organization) {
      return sendError(
        res,
        MESSAGES.ORG.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    if (canViewAudit) {
      const userIds: number[] = [];
      if (organization.createdBy) userIds.push(organization.createdBy);
      if (organization.updatedBy) userIds.push(organization.updatedBy);

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

      const organizationWithAudit = {
        ...organization,
        creator: organization.createdBy ? userMap.get(organization.createdBy) : null,
        updater: organization.updatedBy ? userMap.get(organization.updatedBy) : null,
      };

      return sendSuccess(
        res,
        { organization: organizationWithAudit },
        'Organization retrieved successfully'
      );
    }

    return sendSuccess(
      res,
      { organization },
      'Organization retrieved successfully'
    );
  } catch (error) {
    console.error('Get organization error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Create organization (Super Admin only)
 * POST /api/superadmin/organizations
 * Creates organization, admin role with full permissions, and admin user.
 * Modules are automatically assigned from the subscription plan.
 */
export const createOrganization = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const {
      name,
      slug,
      email,
      phone,
      address,
      countryId,
      stateId,
      cityId,
      postalCode,
      // Organization classification
      organizationTypeId,
      industryTypeId,
      businessCategoryId,
      // Subscription
      subscriptionPlanId,
      subscriptionTenure,
      subscriptionExpiryDate,
      // Admin user fields
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
    } = req.body;

    // Validation
    if (!name || !slug || !email || !subscriptionPlanId) {
      return sendError(
        res,
        'Name, slug, email, and subscription plan are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate location fields (country, state, city are required)
    if (!countryId || !stateId || !cityId) {
      return sendError(
        res,
        'Country, state, and city are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate admin user fields
    if (!adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      return sendError(
        res,
        'Admin user details (firstName, lastName, email, password) are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      return sendError(
        res,
        'Admin password must be at least 8 characters',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate subscription tenure
    if (subscriptionTenure && !['monthly', 'yearly'].includes(subscriptionTenure)) {
      return sendError(
        res,
        'Subscription tenure must be either "monthly" or "yearly"',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if slug is unique
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (existingOrg) {
      return sendError(
        res,
        'Organization slug already exists',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if admin email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
    });

    if (existingUser) {
      return sendError(
        res,
        'Admin email is already registered',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if subscription plan exists and get its modules
    const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: Number(subscriptionPlanId) },
      include: {
        planModules: {
          include: {
            orgModule: true,
          },
        },
      },
    });

    if (!subscriptionPlan) {
      return sendError(
        res,
        'Subscription plan not found',
        STATUS_CODES.NOT_FOUND
      );
    }

    // Generate unique code from slug (uppercase, replace hyphens with underscores)
    const code = slug.toUpperCase().replace(/-/g, '_');

    // Hash admin password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        code,
        email: email.toLowerCase(),
        phone,
        address,
        countryId: Number(countryId),
        stateId: Number(stateId),
        cityId: Number(cityId),
        postalCode,
        // Organization classification
        organizationTypeId: organizationTypeId ? Number(organizationTypeId) : null,
        industryTypeId: industryTypeId ? Number(industryTypeId) : null,
        businessCategoryId: businessCategoryId ? Number(businessCategoryId) : null,
        // Subscription
        subscriptionPlanId: Number(subscriptionPlanId),
        subscriptionTenure: subscriptionTenure || null,
        subscriptionStartDate: new Date(),
        subscriptionExpiryDate: subscriptionExpiryDate
          ? new Date(subscriptionExpiryDate)
          : null,
        isActive: true,
        status: ORG_STATUS.ACTIVE,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        subscriptionPlan: true,
        country: true,
        state: true,
        city: true,
        organizationType: true,
        industryType: true,
        businessCategory: true,
      },
    });

    // Auto-assign modules from the subscription plan
    if (subscriptionPlan.planModules.length > 0) {
      await prisma.organizationModule.createMany({
        data: subscriptionPlan.planModules.map((pm) => ({
          organizationId: organization.id,
          orgModuleId: pm.orgModuleId,
          isEnabled: true,
        })),
      });
    }

    // Create Organization Admin role
    const adminRole = await prisma.role.create({
      data: {
        organizationId: organization.id,
        name: 'Organization Admin',
        code: 'org_admin',
        description: 'Full access to all modules within the organization',
        isSystem: true,
        isActive: true,
      },
    });

    // Create permissions for admin role (full access to all plan modules)
    if (subscriptionPlan.planModules.length > 0) {
      await prisma.rolePermission.createMany({
        data: subscriptionPlan.planModules.map((pm) => ({
          roleId: adminRole.id,
          moduleCode: pm.orgModule.code,
          orgModuleId: pm.orgModuleId,
          canRead: true,
          canWrite: true,
          canUpdate: true,
          canDelete: true,
          canApprove: true,
          canExport: true,
        })),
      });
    }

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        organizationId: organization.id,
        roleId: adminRole.id,
        email: adminEmail.toLowerCase(),
        passwordHash,
        firstName: adminFirstName,
        lastName: adminLastName,
        isActive: true,
        emailVerified: true,
        isSuperAdmin: false,
      },
    });

    // Fetch the organization with all relations
    const orgWithDetails = await prisma.organization.findUnique({
      where: { id: organization.id },
      include: {
        subscriptionPlan: true,
        country: true,
        state: true,
        city: true,
        organizationModules: {
          include: {
            orgModule: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            roles: true,
          },
        },
      },
    });

    return sendSuccess(
      res,
      { organization: orgWithDetails },
      'Organization created successfully with admin user',
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error('Create organization error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Update organization (Super Admin only)
 * PUT /api/superadmin/organizations/:id
 */
export const updateOrganization = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      address,
      countryId,
      stateId,
      cityId,
      postalCode,
      // Organization classification
      organizationTypeId,
      industryTypeId,
      businessCategoryId,
      // Other fields
      logo,
      subscriptionPlanId,
      subscriptionExpiryDate,
      isActive,
      status,
      enabledModules,
    } = req.body;

    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: Number(id) },
    });

    if (!existingOrg) {
      return sendError(
        res,
        MESSAGES.ORG.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Validate location fields if provided
    if (countryId && stateId && cityId) {
      // All three must be provided together
    } else if (countryId || stateId || cityId) {
      return sendError(
        res,
        'Country, state, and city must all be provided together',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(email && { email: email.toLowerCase() }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(countryId && { countryId: Number(countryId) }),
        ...(stateId && { stateId: Number(stateId) }),
        ...(cityId && { cityId: Number(cityId) }),
        ...(postalCode !== undefined && { postalCode }),
        // Organization classification
        ...(organizationTypeId !== undefined && { organizationTypeId: organizationTypeId ? Number(organizationTypeId) : null }),
        ...(industryTypeId !== undefined && { industryTypeId: industryTypeId ? Number(industryTypeId) : null }),
        ...(businessCategoryId !== undefined && { businessCategoryId: businessCategoryId ? Number(businessCategoryId) : null }),
        // Other fields
        ...(logo !== undefined && { logo }),
        ...(subscriptionPlanId && {
          subscriptionPlanId: Number(subscriptionPlanId),
        }),
        ...(subscriptionExpiryDate !== undefined && {
          subscriptionExpiryDate: subscriptionExpiryDate
            ? new Date(subscriptionExpiryDate)
            : null,
        }),
        ...(isActive !== undefined && { isActive }),
        ...(status && { status }),
        updatedBy: userId,
      },
      include: {
        subscriptionPlan: true,
        country: true,
        state: true,
        city: true,
        organizationType: true,
        industryType: true,
        businessCategory: true,
      },
    });

    // Update enabled modules if provided (now uses orgModuleId)
    if (enabledModules !== undefined && Array.isArray(enabledModules)) {
      // Delete existing module associations
      await prisma.organizationModule.deleteMany({
        where: { organizationId: organization.id },
      });

      // Create new associations (enabledModules should now contain orgModuleIds)
      if (enabledModules.length > 0) {
        await prisma.organizationModule.createMany({
          data: enabledModules.map((orgModuleId: number) => ({
            organizationId: organization.id,
            orgModuleId: Number(orgModuleId),
            isEnabled: true,
          })),
        });
      }
    }

    return sendSuccess(
      res,
      { organization },
      'Organization updated successfully'
    );
  } catch (error) {
    console.error('Update organization error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Delete organization (Super Admin only)
 * DELETE /api/superadmin/organizations/:id
 */
export const deleteOrganization = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            users: true,
            employees: true,
          },
        },
      },
    });

    if (!organization) {
      return sendError(
        res,
        MESSAGES.ORG.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Check if organization has users or employees
    if (organization._count.users > 0 || organization._count.employees > 0) {
      return sendError(
        res,
        'Cannot delete organization with existing users or employees. Please remove them first.',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Delete organization
    await prisma.organization.delete({
      where: { id: Number(id) },
    });

    return sendSuccess(
      res,
      null,
      'Organization deleted successfully'
    );
  } catch (error) {
    console.error('Delete organization error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get all subscription plans (Super Admin only)
 * GET /api/superadmin/subscription-plans
 */
export const getSubscriptionPlans = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { includeInactive } = req.query;
    const user = (req as any).user;

    const where = includeInactive === 'true' ? {} : { isActive: true };

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'subscription_plans');

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        priceMonthly: true,
        priceYearly: true,
        currency: true,
        maxUsers: true,
        maxEmployees: true,
        maxStorageMb: true,
        features: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        _count: {
          select: { organizations: true },
        },
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      plans.forEach(plan => {
        if (plan.createdBy) userIds.add(plan.createdBy);
        if (plan.updatedBy) userIds.add(plan.updatedBy);
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

      const plansWithAudit = plans.map(plan => ({
        ...plan,
        creator: plan.createdBy ? userMap.get(plan.createdBy) : null,
        updater: plan.updatedBy ? userMap.get(plan.updatedBy) : null,
      }));

      return sendSuccess(
        res,
        { plans: plansWithAudit },
        'Subscription plans retrieved successfully'
      );
    }

    return sendSuccess(
      res,
      { plans },
      'Subscription plans retrieved successfully'
    );
  } catch (error) {
    console.error('Get subscription plans error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get subscription plan by ID (Super Admin only)
 * GET /api/superadmin/subscription-plans/:id
 */
export const getSubscriptionPlanById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'subscription_plans');

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        priceMonthly: true,
        priceYearly: true,
        currency: true,
        maxUsers: true,
        maxEmployees: true,
        maxStorageMb: true,
        features: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        _count: {
          select: { organizations: true },
        },
      },
    });

    if (!plan) {
      return sendError(
        res,
        'Subscription plan not found',
        STATUS_CODES.NOT_FOUND
      );
    }

    if (canViewAudit) {
      const userIds: number[] = [];
      if (plan.createdBy) userIds.push(plan.createdBy);
      if (plan.updatedBy) userIds.push(plan.updatedBy);

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

      const planWithAudit = {
        ...plan,
        creator: plan.createdBy ? userMap.get(plan.createdBy) : null,
        updater: plan.updatedBy ? userMap.get(plan.updatedBy) : null,
      };

      return sendSuccess(
        res,
        { plan: planWithAudit },
        'Subscription plan retrieved successfully'
      );
    }

    return sendSuccess(
      res,
      { plan },
      'Subscription plan retrieved successfully'
    );
  } catch (error) {
    console.error('Get subscription plan error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Create subscription plan (Super Admin only)
 * POST /api/superadmin/subscription-plans
 */
export const createSubscriptionPlan = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      name,
      code,
      description,
      priceMonthly,
      priceYearly,
      currency,
      maxUsers,
      maxEmployees,
      maxStorageMb,
      features,
      displayOrder,
      moduleIds,
    } = req.body;

    // Get authenticated user ID from JWT
    const userId = (req as any).user?.userId;

    // Validation
    if (!name || !code) {
      return sendError(
        res,
        'Name and code are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate code format (lowercase with hyphens only)
    const codeRegex = /^[a-z0-9-]+$/;
    if (!codeRegex.test(code)) {
      return sendError(
        res,
        'Code must be lowercase letters, numbers, and hyphens only',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if code already exists
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { code },
    });

    if (existingPlan) {
      return sendError(
        res,
        'Plan code already exists',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if name already exists
    const existingPlanName = await prisma.subscriptionPlan.findUnique({
      where: { name },
    });

    if (existingPlanName) {
      return sendError(
        res,
        'Plan name already exists',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Get core modules that must be included
    const coreModules = await prisma.orgModule.findMany({
      where: { isCore: true, isActive: true },
      select: { id: true },
    });
    const coreModuleIds = coreModules.map((m) => m.id);

    // Merge provided moduleIds with core modules (ensure core modules are always included)
    let finalModuleIds: number[] = [];
    if (moduleIds && Array.isArray(moduleIds)) {
      finalModuleIds = [...new Set([...coreModuleIds, ...moduleIds.map(Number)])];
    } else {
      finalModuleIds = coreModuleIds;
    }

    // Create subscription plan
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        code: code.toLowerCase(),
        description,
        priceMonthly: priceMonthly ? parseFloat(priceMonthly) : null,
        priceYearly: priceYearly ? parseFloat(priceYearly) : null,
        currency: currency || 'INR',
        maxUsers: maxUsers !== undefined ? Number(maxUsers) : null,
        maxEmployees: maxEmployees !== undefined ? Number(maxEmployees) : null,
        maxStorageMb: maxStorageMb !== undefined ? Number(maxStorageMb) : null,
        features: features || [],
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
        isActive: true,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { organizations: true },
        },
      },
    });

    // Create plan modules
    if (finalModuleIds.length > 0) {
      await prisma.planModule.createMany({
        data: finalModuleIds.map((moduleId) => ({
          subscriptionPlanId: plan.id,
          orgModuleId: moduleId,
        })),
      });
    }

    // Fetch the plan with modules
    const planWithModules = await prisma.subscriptionPlan.findUnique({
      where: { id: plan.id },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        planModules: {
          include: {
            orgModule: true,
          },
        },
        _count: {
          select: { organizations: true, planModules: true },
        },
      },
    });

    return sendSuccess(
      res,
      { plan: planWithModules },
      'Subscription plan created successfully',
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error('Create subscription plan error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Update subscription plan (Super Admin only)
 * PUT /api/superadmin/subscription-plans/:id
 */
export const updateSubscriptionPlan = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      priceMonthly,
      priceYearly,
      currency,
      maxUsers,
      maxEmployees,
      maxStorageMb,
      features,
      displayOrder,
      isActive,
    } = req.body;

    // Get authenticated user ID from JWT
    const userId = (req as any).user?.userId;

    // Check if plan exists
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPlan) {
      return sendError(
        res,
        'Subscription plan not found',
        STATUS_CODES.NOT_FOUND
      );
    }

    // Check if name already exists (if updating name)
    if (name && name !== existingPlan.name) {
      const nameExists = await prisma.subscriptionPlan.findUnique({
        where: { name },
      });

      if (nameExists) {
        return sendError(
          res,
          'Plan name already exists',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Update subscription plan
    const plan = await prisma.subscriptionPlan.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(priceMonthly !== undefined && {
          priceMonthly: priceMonthly ? parseFloat(priceMonthly) : null,
        }),
        ...(priceYearly !== undefined && {
          priceYearly: priceYearly ? parseFloat(priceYearly) : null,
        }),
        ...(currency && { currency }),
        ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
        ...(maxEmployees !== undefined && { maxEmployees: Number(maxEmployees) }),
        ...(maxStorageMb !== undefined && { maxStorageMb: Number(maxStorageMb) }),
        ...(features !== undefined && { features }),
        ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
        ...(isActive !== undefined && { isActive }),
        updatedBy: userId || null,
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        updater: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { organizations: true },
        },
      },
    });

    return sendSuccess(
      res,
      { plan },
      'Subscription plan updated successfully'
    );
  } catch (error) {
    console.error('Update subscription plan error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Delete subscription plan (Super Admin only) - Soft delete
 * DELETE /api/superadmin/subscription-plans/:id
 */
export const deleteSubscriptionPlan = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    // Get authenticated user ID from JWT
    const userId = (req as any).user?.userId;

    // Check if plan exists
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            organizations: {
              where: { status: 'active' },
            },
          },
        },
      },
    });

    if (!plan) {
      return sendError(
        res,
        'Subscription plan not found',
        STATUS_CODES.NOT_FOUND
      );
    }

    // Check if plan is in use by active organizations
    if (plan._count.organizations > 0) {
      return sendError(
        res,
        `Cannot delete plan. ${plan._count.organizations} active organization(s) are using this plan.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Soft delete - set isActive to false
    await prisma.subscriptionPlan.update({
      where: { id: Number(id) },
      data: {
        isActive: false,
        updatedBy: userId || null,
      },
    });

    return sendSuccess(
      res,
      null,
      'Subscription plan deleted successfully'
    );
  } catch (error) {
    console.error('Delete subscription plan error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get all org modules (Super Admin only)
 * GET /api/superadmin/modules
 * @deprecated Use module.controller.ts endpoints instead
 */
export const getModules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const modules = await prisma.orgModule.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    return sendSuccess(
      res,
      { modules },
      'Modules retrieved successfully'
    );
  } catch (error) {
    console.error('Get modules error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get Organization Profile (Tenant)
 * GET /api/v1/:orgSlug/organization/profile
 * Returns organization details with statistics
 */
export const getOrganizationProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const organization = (req as any).organization;

    if (!organization) {
      return sendError(
        res,
        'Organization context not found',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Fetch organization with all relations
    const org = await prisma.organization.findUnique({
      where: { id: organization.id },
      include: {
        subscriptionPlan: {
          select: {
            id: true,
            name: true,
            code: true,
            maxUsers: true,
            maxEmployees: true,
            maxStorageMb: true,
            priceMonthly: true,
            priceYearly: true,
            currency: true,
          },
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        state: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
          },
        },
        organizationType: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        industryType: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        businessCategory: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!org) {
      return sendError(
        res,
        MESSAGES.ORG.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Calculate statistics
    const [totalUsers, totalEmployees, enabledModulesCount] = await Promise.all([
      prisma.user.count({
        where: {
          organizationId: organization.id,
          isActive: true,
        },
      }),
      prisma.employee.count({
        where: {
          organizationId: organization.id,
          isActive: true,
        },
      }),
      prisma.organizationModule.count({
        where: {
          organizationId: organization.id,
          isEnabled: true,
        },
      }),
    ]);

    const statistics = {
      totalUsers,
      totalEmployees,
      storageUsedMb: 0, // Placeholder for future implementation
      enabledModulesCount,
    };

    return sendSuccess(
      res,
      {
        organization: org,
        statistics,
      },
      'Organization profile fetched successfully'
    );
  } catch (error) {
    console.error('Get organization profile error:', error);
    return sendError(
      res,
      'Failed to fetch organization profile',
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Update Organization Profile (Tenant)
 * PUT /api/v1/:orgSlug/organization/profile
 * Updates organization details (logo upload handled via multer middleware)
 */
export const updateOrganizationProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const organization = (req as any).organization;

    if (!organization) {
      return sendError(
        res,
        'Organization context not found',
        STATUS_CODES.BAD_REQUEST
      );
    }

    const {
      name,
      email,
      phone,
      address,
      cityId,
      postalCode,
      organizationTypeId,
      industryTypeId,
      businessCategoryId,
      themePrimaryColor,
      themeSecondaryColor,
      themeAccentColor,
    } = req.body;

    // Handle logo upload from multer
    let logoPath = undefined;
    if (req.file) {
      logoPath = `/uploads/organizations/${req.file.filename}`;

      // Delete old logo if exists
      if (organization.logo) {
        const { deleteOldProfilePicture } = require('../middleware/upload.middleware');
        deleteOldProfilePicture(organization.logo);
      }
    }

    // Validate hex color format if provided
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (themePrimaryColor && !hexColorRegex.test(themePrimaryColor)) {
      return sendError(
        res,
        'Invalid primary color format. Use hex format like #3B82F6',
        STATUS_CODES.BAD_REQUEST
      );
    }
    if (themeSecondaryColor && !hexColorRegex.test(themeSecondaryColor)) {
      return sendError(
        res,
        'Invalid secondary color format. Use hex format like #3B82F6',
        STATUS_CODES.BAD_REQUEST
      );
    }
    if (themeAccentColor && !hexColorRegex.test(themeAccentColor)) {
      return sendError(
        res,
        'Invalid accent color format. Use hex format like #3B82F6',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // If cityId is provided, validate it exists and get state/country
    let updateData: any = {
      ...(name && { name }),
      ...(email && { email: email.toLowerCase() }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(postalCode !== undefined && { postalCode }),
      ...(organizationTypeId !== undefined && {
        organizationTypeId: organizationTypeId ? Number(organizationTypeId) : null,
      }),
      ...(industryTypeId !== undefined && {
        industryTypeId: industryTypeId ? Number(industryTypeId) : null,
      }),
      ...(businessCategoryId !== undefined && {
        businessCategoryId: businessCategoryId ? Number(businessCategoryId) : null,
      }),
      ...(themePrimaryColor !== undefined && { themePrimaryColor }),
      ...(themeSecondaryColor !== undefined && { themeSecondaryColor }),
      ...(themeAccentColor !== undefined && { themeAccentColor }),
      ...(logoPath && { logo: logoPath }),
      updatedBy: userId,
    };

    // If cityId is provided, also update state and country
    if (cityId) {
      const city = await prisma.city.findUnique({
        where: { id: Number(cityId) },
        select: {
          id: true,
          stateId: true,
          state: {
            select: {
              id: true,
              countryId: true
            }
          }
        },
      });

      if (!city) {
        return sendError(
          res,
          'Invalid city selected',
          STATUS_CODES.BAD_REQUEST
        );
      }

      updateData.cityId = city.id;
      updateData.stateId = city.stateId;
      updateData.countryId = city.state.countryId;
    }

    // Update organization
    const updatedOrg = await prisma.organization.update({
      where: { id: organization.id },
      data: updateData,
      include: {
        subscriptionPlan: {
          select: {
            id: true,
            name: true,
            code: true,
            maxUsers: true,
            maxEmployees: true,
            maxStorageMb: true,
            priceMonthly: true,
            priceYearly: true,
            currency: true,
          },
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        state: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
          },
        },
        organizationType: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        industryType: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        businessCategory: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return sendSuccess(
      res,
      { organization: updatedOrg },
      'Organization profile updated successfully'
    );
  } catch (error) {
    console.error('Update organization profile error:', error);
    return sendError(
      res,
      'Failed to update organization profile',
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};
