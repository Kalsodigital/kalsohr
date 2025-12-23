import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { checkOrgPermission, checkAnyOrgPermission } from '../middleware/permission.middleware';
import { upload, employeeUpload, organizationLogoUpload } from '../middleware/upload.middleware';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/role.controller';
import {
  getRolePermissions,
  updateRolePermissions,
} from '../controllers/permission.controller';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller';
import {
  getAllCountries,
} from '../controllers/country.controller';
import {
  getAllStates,
} from '../controllers/state.controller';
import {
  getAllCities,
} from '../controllers/city.controller';
import {
  getAllEmploymentTypes,
  getEmploymentTypeById,
  createEmploymentType,
  updateEmploymentType,
  deleteEmploymentType,
} from '../controllers/employment-type.controller';
import {
  getAllDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from '../controllers/designation.controller';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller';
import {
  getAllLeaveTypes,
  getLeaveTypeById,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
} from '../controllers/leave-type.controller';
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../controllers/branch.controller';
import {
  getAllOrganizationalPositions,
  getOrganizationalPositionById,
  createOrganizationalPosition,
  updateOrganizationalPosition,
  deleteOrganizationalPosition,
} from '../controllers/organizational-position.controller';
import {
  getAllJobPositions,
  getJobPositionById,
  createJobPosition,
  updateJobPosition,
  deleteJobPosition,
} from '../controllers/job-position.controller';
import {
  getAllHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from '../controllers/holiday.controller';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkExportEmployees,
  bulkUpdateEmployeeStatus,
} from '../controllers/employee.controller';
import {
  getAllMaritalStatuses,
  getMaritalStatusById,
  createMaritalStatus,
  updateMaritalStatus,
  deleteMaritalStatus,
} from '../controllers/maritalstatus.controller';
import {
  getAllReligions,
  getReligionById,
  createReligion,
  updateReligion,
  deleteReligion,
} from '../controllers/religion.controller';
import {
  getOrganizationProfile,
  updateOrganizationProfile,
} from '../controllers/organization.controller';

const router = Router({ mergeParams: true }); // mergeParams: true to access :orgSlug

/**
 * All tenant routes are prefixed with /api/:orgSlug
 * Middleware chain:
 * 1. authenticate - Ensures user is logged in
 * 2. tenantContext - Validates org exists, is active, and user belongs to it (blocks super admins)
 * 3. checkOrgPermission - Validates module is enabled and user has required permission
 */

// Apply authentication and tenant context to ALL routes
router.use(authenticate);
router.use(tenantContext);

/**
 * Role Management Routes
 * /api/:orgSlug/roles
 */

// Get all roles for this organization
router.get(
  '/roles',
  checkAnyOrgPermission('roles'),
  getAllRoles  // The controller now reads organizationId from req.organizationId (set by tenant middleware)
);

// Get single role by ID
router.get(
  '/roles/:id',
  checkOrgPermission('roles', 'canRead'),
  getRoleById
);

// Create new role for this organization
router.post(
  '/roles',
  checkOrgPermission('roles', 'canWrite'),
  async (req, res) => {
    // Automatically set organizationId from tenant context
    req.body.organizationId = (req as any).organizationId;
    return createRole(req, res);
  }
);

// Update role
router.put(
  '/roles/:id',
  checkOrgPermission('roles', 'canUpdate'),
  updateRole
);

// Delete role
router.delete(
  '/roles/:id',
  checkOrgPermission('roles', 'canDelete'),
  deleteRole
);

/**
 * Permission Management Routes
 * /api/:orgSlug/permissions
 */

// Get permissions for a role
router.get(
  '/permissions/:roleId',
  checkOrgPermission('roles', 'canRead'),
  getRolePermissions
);

// Update permissions for a role
router.put(
  '/permissions/:roleId',
  checkOrgPermission('roles', 'canUpdate'),
  updateRolePermissions
);

/**
 * User Management Routes (Organization-scoped)
 * /api/:orgSlug/users
 */

// Get all users for this organization
router.get(
  '/users',
  checkAnyOrgPermission('users'),
  getAllUsers  // The controller now reads organizationId from req.organizationId (set by tenant middleware)
);

// Get single user by ID
router.get(
  '/users/:id',
  checkOrgPermission('users', 'canRead'),
  getUserById
);

// Create new user for this organization
router.post(
  '/users',
  checkOrgPermission('users', 'canWrite'),
  async (req, res) => {
    // Automatically set organizationId from tenant context
    req.body.organizationId = (req as any).organizationId;
    // Organization users can never be super admins
    req.body.isSuperAdmin = false;
    return createUser(req, res);
  }
);

// Update user
router.put(
  '/users/:id',
  checkOrgPermission('users', 'canUpdate'),
  updateUser
);

// Delete user
router.delete(
  '/users/:id',
  checkOrgPermission('users', 'canDelete'),
  deleteUser
);

/**
 * Organization Modules Route
 * Get enabled modules for permission matrix
 * /api/:orgSlug/modules
 */
router.get('/modules', async (req, res) => {
  try {
    const { prisma } = await import('../index');
    const organizationId = (req as any).organizationId;

    const enabledModules = await prisma.organizationModule.findMany({
      where: {
        organizationId,
        isEnabled: true,
      },
      include: {
        orgModule: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isCore: true,
          },
        },
      },
    });

    const modules = enabledModules.map((om) => om.orgModule);

    return res.json({
      success: true,
      data: modules,
      message: 'Enabled modules retrieved successfully',
    });
  } catch (error) {
    console.error('Get enabled modules error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get enabled modules',
      error,
    });
  }
});

/**
 * Organization Profile Routes
 * /api/:orgSlug/organization/profile
 * Access: Organization admins can view and update their own organization profile
 */

// Get organization profile with statistics
router.get('/organization/profile', getOrganizationProfile);

// Update organization profile (with optional logo upload)
router.put(
  '/organization/profile',
  checkOrgPermission('settings', 'canUpdate'),
  organizationLogoUpload.single('logo'),
  updateOrganizationProfile
);

/**
 * Master Data Routes (Read-only for organizations)
 * /api/:orgSlug/masters/*
 */

// Get all countries (read-only)
router.get('/masters/countries', getAllCountries);

// Get all states (read-only, supports ?countryId filter)
router.get('/masters/states', getAllStates);

// Get all cities (read-only, supports ?stateId filter)
router.get('/masters/cities', getAllCities);

/**
 * Organization Master Data Routes
 * /api/:orgSlug/masters/*
 * Full CRUD operations for organization-specific master data
 */

// Employment Types
router.get('/masters/employment-types', checkOrgPermission('master_data', 'canRead'), getAllEmploymentTypes);
router.get('/masters/employment-types/:id', checkOrgPermission('master_data', 'canRead'), getEmploymentTypeById);
router.post('/masters/employment-types', checkOrgPermission('master_data', 'canWrite'), createEmploymentType);
router.put('/masters/employment-types/:id', checkOrgPermission('master_data', 'canUpdate'), updateEmploymentType);
router.delete('/masters/employment-types/:id', checkOrgPermission('master_data', 'canDelete'), deleteEmploymentType);

// Designations
router.get('/masters/designations', checkOrgPermission('master_data', 'canRead'), getAllDesignations);
router.get('/masters/designations/:id', checkOrgPermission('master_data', 'canRead'), getDesignationById);
router.post('/masters/designations', checkOrgPermission('master_data', 'canWrite'), createDesignation);
router.put('/masters/designations/:id', checkOrgPermission('master_data', 'canUpdate'), updateDesignation);
router.delete('/masters/designations/:id', checkOrgPermission('master_data', 'canDelete'), deleteDesignation);

// Departments
router.get('/masters/departments', checkOrgPermission('master_data', 'canRead'), getAllDepartments);
router.get('/masters/departments/:id', checkOrgPermission('master_data', 'canRead'), getDepartmentById);
router.post('/masters/departments', checkOrgPermission('master_data', 'canWrite'), createDepartment);
router.put('/masters/departments/:id', checkOrgPermission('master_data', 'canUpdate'), updateDepartment);
router.delete('/masters/departments/:id', checkOrgPermission('master_data', 'canDelete'), deleteDepartment);

// Leave Types
router.get('/masters/leave-types', checkOrgPermission('master_data', 'canRead'), getAllLeaveTypes);
router.get('/masters/leave-types/:id', checkOrgPermission('master_data', 'canRead'), getLeaveTypeById);
router.post('/masters/leave-types', checkOrgPermission('master_data', 'canWrite'), createLeaveType);
router.put('/masters/leave-types/:id', checkOrgPermission('master_data', 'canUpdate'), updateLeaveType);
router.delete('/masters/leave-types/:id', checkOrgPermission('master_data', 'canDelete'), deleteLeaveType);

// Branches
router.get('/masters/branches', checkOrgPermission('master_data', 'canRead'), getAllBranches);
router.get('/masters/branches/:id', checkOrgPermission('master_data', 'canRead'), getBranchById);
router.post('/masters/branches', checkOrgPermission('master_data', 'canWrite'), createBranch);
router.put('/masters/branches/:id', checkOrgPermission('master_data', 'canUpdate'), updateBranch);
router.delete('/masters/branches/:id', checkOrgPermission('master_data', 'canDelete'), deleteBranch);

// Organizational Positions
router.get('/masters/organizational-positions', checkOrgPermission('master_data', 'canRead'), getAllOrganizationalPositions);
router.get('/masters/organizational-positions/:id', checkOrgPermission('master_data', 'canRead'), getOrganizationalPositionById);
router.post('/masters/organizational-positions', checkOrgPermission('master_data', 'canWrite'), createOrganizationalPosition);
router.put('/masters/organizational-positions/:id', checkOrgPermission('master_data', 'canUpdate'), updateOrganizationalPosition);
router.delete('/masters/organizational-positions/:id', checkOrgPermission('master_data', 'canDelete'), deleteOrganizationalPosition);

// Job Positions (Recruitment)
router.get('/masters/job-positions', checkOrgPermission('master_data', 'canRead'), getAllJobPositions);
router.get('/masters/job-positions/:id', checkOrgPermission('master_data', 'canRead'), getJobPositionById);
router.post('/masters/job-positions', checkOrgPermission('master_data', 'canWrite'), createJobPosition);
router.put('/masters/job-positions/:id', checkOrgPermission('master_data', 'canUpdate'), updateJobPosition);
router.delete('/masters/job-positions/:id', checkOrgPermission('master_data', 'canDelete'), deleteJobPosition);

// Holidays
router.get('/masters/holidays', checkOrgPermission('master_data', 'canRead'), getAllHolidays);
router.get('/masters/holidays/:id', checkOrgPermission('master_data', 'canRead'), getHolidayById);
router.post('/masters/holidays', checkOrgPermission('master_data', 'canWrite'), createHoliday);
router.put('/masters/holidays/:id', checkOrgPermission('master_data', 'canUpdate'), updateHoliday);
router.delete('/masters/holidays/:id', checkOrgPermission('master_data', 'canDelete'), deleteHoliday);

// Marital Statuses
router.get('/masters/marital-statuses', checkOrgPermission('master_data', 'canRead'), getAllMaritalStatuses);
router.get('/masters/marital-statuses/:id', checkOrgPermission('master_data', 'canRead'), getMaritalStatusById);
router.post('/masters/marital-statuses', checkOrgPermission('master_data', 'canWrite'), createMaritalStatus);
router.put('/masters/marital-statuses/:id', checkOrgPermission('master_data', 'canUpdate'), updateMaritalStatus);
router.delete('/masters/marital-statuses/:id', checkOrgPermission('master_data', 'canDelete'), deleteMaritalStatus);

// Religions
router.get('/masters/religions', checkOrgPermission('master_data', 'canRead'), getAllReligions);
router.get('/masters/religions/:id', checkOrgPermission('master_data', 'canRead'), getReligionById);
router.post('/masters/religions', checkOrgPermission('master_data', 'canWrite'), createReligion);
router.put('/masters/religions/:id', checkOrgPermission('master_data', 'canUpdate'), updateReligion);
router.delete('/masters/religions/:id', checkOrgPermission('master_data', 'canDelete'), deleteReligion);

/**
 * Employee Management Routes
 * /api/:orgSlug/employees
 * Full CRUD operations for organization employees with advanced features
 */

// Get all employees (with pagination, search, and filters)
router.get('/employees', checkOrgPermission('employees', 'canRead'), getAllEmployees);

// Export employees to CSV (specific route BEFORE parameterized route)
router.get('/employees/export/csv', checkOrgPermission('employees', 'canExport'), bulkExportEmployees);

// Get single employee by ID (with all relations and siblings)
router.get('/employees/:id', checkOrgPermission('employees', 'canRead'), getEmployeeById);

// Create new employee for this organization (with optional profile picture and ID proof upload)
router.post('/employees', checkOrgPermission('employees', 'canWrite'), employeeUpload, createEmployee);

// Update employee (with optional profile picture and ID proof upload)
router.put('/employees/:id', checkOrgPermission('employees', 'canUpdate'), employeeUpload, updateEmployee);

// Delete employee
router.delete('/employees/:id', checkOrgPermission('employees', 'canDelete'), deleteEmployee);

// Bulk update employee status
router.patch('/employees/bulk-status', checkOrgPermission('employees', 'canUpdate'), bulkUpdateEmployeeStatus);

export default router;
