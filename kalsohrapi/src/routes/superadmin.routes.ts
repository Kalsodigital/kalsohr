import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';
import { checkPermission, checkAnyPermission } from '../middleware/permission.middleware';
import { getDashboardStats } from '../controllers/dashboard.controller';
import {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getSubscriptionPlans,
  getSubscriptionPlanById,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
} from '../controllers/organization.controller';
import {
  getPlatformModules,
  getOrgModules,
  getPlanModules,
  updatePlanModules,
  getOrganizationModules,
  updateOrganizationModules,
} from '../controllers/module.controller';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller';
import {
  getPlatformRoles,
  getOrganizationRoles,
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/role.controller';
import {
  getRolePermissions,
  updateRolePermissions,
  updateModulePermission,
} from '../controllers/permission.controller';
import {
  getAllCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
} from '../controllers/country.controller';
import {
  getAllStates,
  getStateById,
  createState,
  updateState,
  deleteState,
} from '../controllers/state.controller';
import {
  getAllCities,
  getCityById,
  createCity,
  updateCity,
  deleteCity,
} from '../controllers/city.controller';
import {
  getAllBloodGroups,
  getBloodGroupById,
  createBloodGroup,
  updateBloodGroup,
  deleteBloodGroup,
} from '../controllers/bloodgroup.controller';
import {
  getAllGenders,
  getGenderById,
  createGender,
  updateGender,
  deleteGender,
} from '../controllers/gender.controller';
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
  getAllEducationLevels,
  getEducationLevelById,
  createEducationLevel,
  updateEducationLevel,
  deleteEducationLevel,
} from '../controllers/educationlevel.controller';
import {
  getAllDocumentTypes,
  getDocumentTypeById,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
} from '../controllers/documenttype.controller';
import {
  getAllOrganizationTypes,
  getOrganizationTypeById,
  createOrganizationType,
  updateOrganizationType,
  deleteOrganizationType,
} from '../controllers/organizationtype.controller';
import {
  getAllIndustryTypes,
  getIndustryTypeById,
  createIndustryType,
  updateIndustryType,
  deleteIndustryType,
} from '../controllers/industrytype.controller';
import {
  getAllBusinessCategories,
  getBusinessCategoryById,
  createBusinessCategory,
  updateBusinessCategory,
  deleteBusinessCategory,
} from '../controllers/businesscategory.controller';

const router = Router();

// All super admin routes require authentication and super admin role
router.use(authenticate, requireSuperAdmin);

// ============================================
// DASHBOARD ROUTES
// ============================================

/**
 * @route   GET /api/superadmin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Super Admin
 */
router.get('/dashboard/stats', getDashboardStats);

// ============================================
// ORGANIZATION ROUTES
// ============================================

/**
 * @route   GET /api/superadmin/organizations
 * @desc    Get all organizations
 * @access  Super Admin with 'organizations' read permission
 */
router.get('/organizations', checkPermission('organizations', 'canRead'), getAllOrganizations);

/**
 * @route   GET /api/superadmin/organizations/:id
 * @desc    Get organization by ID
 * @access  Super Admin with 'organizations' read permission
 */
router.get('/organizations/:id', checkPermission('organizations', 'canRead'), getOrganizationById);

/**
 * @route   POST /api/superadmin/organizations
 * @desc    Create organization
 * @access  Super Admin with 'organizations' write permission
 */
router.post('/organizations', checkPermission('organizations', 'canWrite'), createOrganization);

/**
 * @route   PUT /api/superadmin/organizations/:id
 * @desc    Update organization
 * @access  Super Admin with 'organizations' update permission
 */
router.put('/organizations/:id', checkPermission('organizations', 'canUpdate'), updateOrganization);

/**
 * @route   DELETE /api/superadmin/organizations/:id
 * @desc    Delete organization
 * @access  Super Admin with 'organizations' delete permission
 */
router.delete('/organizations/:id', checkPermission('organizations', 'canDelete'), deleteOrganization);

// ============================================
// USER ROUTES
// ============================================

/**
 * @route   GET /api/superadmin/users
 * @desc    Get all users
 * @access  Super Admin
 */
router.get('/users', getAllUsers);

/**
 * @route   GET /api/superadmin/users/:id
 * @desc    Get user by ID
 * @access  Super Admin
 */
router.get('/users/:id', getUserById);

/**
 * @route   POST /api/superadmin/users
 * @desc    Create user
 * @access  Super Admin
 */
router.post('/users', createUser);

/**
 * @route   PUT /api/superadmin/users/:id
 * @desc    Update user
 * @access  Super Admin
 */
router.put('/users/:id', updateUser);

/**
 * @route   DELETE /api/superadmin/users/:id
 * @desc    Delete user
 * @access  Super Admin
 */
router.delete('/users/:id', deleteUser);

// ============================================
// SUBSCRIPTION PLAN ROUTES
// ============================================

/**
 * @route   GET /api/superadmin/subscription-plans
 * @desc    Get all subscription plans
 * @access  Super Admin with 'subscription_plans' read permission
 */
router.get('/subscription-plans', checkPermission('subscription_plans', 'canRead'), getSubscriptionPlans);

/**
 * @route   GET /api/superadmin/subscription-plans/:id
 * @desc    Get subscription plan by ID
 * @access  Super Admin with 'subscription_plans' read permission
 */
router.get('/subscription-plans/:id', checkPermission('subscription_plans', 'canRead'), getSubscriptionPlanById);

/**
 * @route   POST /api/superadmin/subscription-plans
 * @desc    Create subscription plan
 * @access  Super Admin with 'subscription_plans' write permission
 */
router.post('/subscription-plans', checkPermission('subscription_plans', 'canWrite'), createSubscriptionPlan);

/**
 * @route   PUT /api/superadmin/subscription-plans/:id
 * @desc    Update subscription plan
 * @access  Super Admin with 'subscription_plans' update permission
 */
router.put('/subscription-plans/:id', checkPermission('subscription_plans', 'canUpdate'), updateSubscriptionPlan);

/**
 * @route   DELETE /api/superadmin/subscription-plans/:id
 * @desc    Delete subscription plan (soft delete)
 * @access  Super Admin with 'subscription_plans' delete permission
 */
router.delete('/subscription-plans/:id', checkPermission('subscription_plans', 'canDelete'), deleteSubscriptionPlan);

// ============================================
// MODULE ROUTES
// ============================================

/**
 * @route   GET /api/superadmin/platform-modules
 * @desc    Get all platform modules (SuperAdmin panel)
 * @access  Super Admin with 'system_modules' read permission
 */
router.get('/platform-modules', checkPermission('system_modules', 'canRead'), getPlatformModules);

/**
 * @route   GET /api/superadmin/org-modules
 * @desc    Get all org modules (Tenant organizations)
 * @access  Super Admin with 'system_modules' read permission
 */
router.get('/org-modules', checkPermission('system_modules', 'canRead'), getOrgModules);

/**
 * @route   GET /api/superadmin/subscription-plans/:planId/modules
 * @desc    Get modules for a subscription plan
 * @access  Super Admin with 'subscription_plans' read permission
 */
router.get('/subscription-plans/:planId/modules', checkPermission('subscription_plans', 'canRead'), getPlanModules);

/**
 * @route   PUT /api/superadmin/subscription-plans/:planId/modules
 * @desc    Update modules for a subscription plan
 * @access  Super Admin with 'subscription_plans' update permission
 */
router.put('/subscription-plans/:planId/modules', checkPermission('subscription_plans', 'canUpdate'), updatePlanModules);

/**
 * @route   GET /api/superadmin/organizations/:orgId/modules
 * @desc    Get modules enabled for an organization
 * @access  Super Admin with 'organizations' read permission
 */
router.get('/organizations/:orgId/modules', checkPermission('organizations', 'canRead'), getOrganizationModules);

/**
 * @route   PUT /api/superadmin/organizations/:orgId/modules
 * @desc    Update module enabled status for an organization
 * @access  Super Admin with 'organizations' update permission
 */
router.put('/organizations/:orgId/modules', checkPermission('organizations', 'canUpdate'), updateOrganizationModules);

// ============================================
// ROLE ROUTES
// ============================================

/**
 * @route   GET /api/superadmin/platform-roles
 * @desc    Get all platform-level roles
 * @access  Super Admin
 */
router.get('/platform-roles', getPlatformRoles);

/**
 * @route   GET /api/superadmin/org-roles
 * @desc    Get roles for a specific organization
 * @access  Super Admin
 */
router.get('/org-roles', getOrganizationRoles);

/**
 * @route   GET /api/superadmin/roles
 * @desc    Get all roles (with optional organization filter)
 * @access  Super Admin
 */
router.get('/roles', getAllRoles);

/**
 * @route   GET /api/superadmin/roles/:id
 * @desc    Get role by ID
 * @access  Super Admin
 */
router.get('/roles/:id', getRoleById);

/**
 * @route   POST /api/superadmin/roles
 * @desc    Create role
 * @access  Super Admin
 */
router.post('/roles', createRole);

/**
 * @route   PUT /api/superadmin/roles/:id
 * @desc    Update role
 * @access  Super Admin
 */
router.put('/roles/:id', updateRole);

/**
 * @route   DELETE /api/superadmin/roles/:id
 * @desc    Delete role
 * @access  Super Admin
 */
router.delete('/roles/:id', deleteRole);

// ============================================
// PERMISSION ROUTES
// ============================================

/**
 * @route   GET /api/superadmin/permissions/:roleId
 * @desc    Get permissions for a role
 * @access  Super Admin
 */
router.get('/permissions/:roleId', getRolePermissions);

/**
 * @route   PUT /api/superadmin/permissions/:roleId
 * @desc    Update permissions for a role
 * @access  Super Admin
 */
router.put('/permissions/:roleId', updateRolePermissions);

/**
 * @route   PATCH /api/superadmin/permissions/:roleId/:moduleCode
 * @desc    Update a single module permission for a role
 * @access  Super Admin
 */
router.patch('/permissions/:roleId/:moduleCode', updateModulePermission);

// ============================================
// MASTER DATA ROUTES - COUNTRIES
// ============================================

/**
 * @route   GET /api/superadmin/masters/countries
 * @desc    Get all countries
 * @access  Super Admin
 */
router.get('/masters/countries', checkPermission('master_data', 'canRead'), getAllCountries);

/**
 * @route   GET /api/superadmin/masters/countries/:id
 * @desc    Get country by ID
 * @access  Super Admin
 */
router.get('/masters/countries/:id', checkPermission('master_data', 'canRead'), getCountryById);

/**
 * @route   POST /api/superadmin/masters/countries
 * @desc    Create country
 * @access  Super Admin
 */
router.post('/masters/countries', checkPermission('master_data', 'canWrite'), createCountry);

/**
 * @route   PUT /api/superadmin/masters/countries/:id
 * @desc    Update country
 * @access  Super Admin
 */
router.put('/masters/countries/:id', checkPermission('master_data', 'canUpdate'), updateCountry);

/**
 * @route   DELETE /api/superadmin/masters/countries/:id
 * @desc    Delete country
 * @access  Super Admin
 */
router.delete('/masters/countries/:id', checkPermission('master_data', 'canDelete'), deleteCountry);

// ============================================
// MASTER DATA ROUTES - STATES
// ============================================

/**
 * @route   GET /api/superadmin/masters/states
 * @desc    Get all states (with optional countryId filter)
 * @access  Super Admin
 */
router.get('/masters/states', checkPermission('master_data', 'canRead'), getAllStates);

/**
 * @route   GET /api/superadmin/masters/states/:id
 * @desc    Get state by ID
 * @access  Super Admin
 */
router.get('/masters/states/:id', checkPermission('master_data', 'canRead'), getStateById);

/**
 * @route   POST /api/superadmin/masters/states
 * @desc    Create state
 * @access  Super Admin
 */
router.post('/masters/states', checkPermission('master_data', 'canWrite'), createState);

/**
 * @route   PUT /api/superadmin/masters/states/:id
 * @desc    Update state
 * @access  Super Admin
 */
router.put('/masters/states/:id', checkPermission('master_data', 'canUpdate'), updateState);

/**
 * @route   DELETE /api/superadmin/masters/states/:id
 * @desc    Delete state
 * @access  Super Admin
 */
router.delete('/masters/states/:id', checkPermission('master_data', 'canDelete'), deleteState);

// ============================================
// MASTER DATA ROUTES - CITIES
// ============================================

/**
 * @route   GET /api/superadmin/masters/cities
 * @desc    Get all cities (with optional stateId, countryId, type filters)
 * @access  Super Admin
 */
router.get('/masters/cities', checkPermission('master_data', 'canRead'), getAllCities);

/**
 * @route   GET /api/superadmin/masters/cities/:id
 * @desc    Get city by ID
 * @access  Super Admin
 */
router.get('/masters/cities/:id', checkPermission('master_data', 'canRead'), getCityById);

/**
 * @route   POST /api/superadmin/masters/cities
 * @desc    Create city
 * @access  Super Admin
 */
router.post('/masters/cities', checkPermission('master_data', 'canWrite'), createCity);

/**
 * @route   PUT /api/superadmin/masters/cities/:id
 * @desc    Update city
 * @access  Super Admin
 */
router.put('/masters/cities/:id', checkPermission('master_data', 'canUpdate'), updateCity);

/**
 * @route   DELETE /api/superadmin/masters/cities/:id
 * @desc    Delete city
 * @access  Super Admin
 */
router.delete('/masters/cities/:id', checkPermission('master_data', 'canDelete'), deleteCity);

// ============================================
// MASTER DATA ROUTES - BLOOD GROUPS
// ============================================

/**
 * @route   GET /api/superadmin/masters/blood-groups
 * @desc    Get all blood groups
 * @access  Super Admin
 */
router.get('/masters/blood-groups', checkPermission('master_data', 'canRead'), getAllBloodGroups);

/**
 * @route   GET /api/superadmin/masters/blood-groups/:id
 * @desc    Get blood group by ID
 * @access  Super Admin
 */
router.get('/masters/blood-groups/:id', checkPermission('master_data', 'canRead'), getBloodGroupById);

/**
 * @route   POST /api/superadmin/masters/blood-groups
 * @desc    Create blood group
 * @access  Super Admin
 */
router.post('/masters/blood-groups', checkPermission('master_data', 'canWrite'), createBloodGroup);

/**
 * @route   PUT /api/superadmin/masters/blood-groups/:id
 * @desc    Update blood group
 * @access  Super Admin
 */
router.put('/masters/blood-groups/:id', checkPermission('master_data', 'canUpdate'), updateBloodGroup);

/**
 * @route   DELETE /api/superadmin/masters/blood-groups/:id
 * @desc    Delete blood group
 * @access  Super Admin
 */
router.delete('/masters/blood-groups/:id', checkPermission('master_data', 'canDelete'), deleteBloodGroup);

// ============================================
// MASTER DATA ROUTES - GENDERS
// ============================================

/**
 * @route   GET /api/superadmin/masters/genders
 * @desc    Get all genders
 * @access  Super Admin
 */
router.get('/masters/genders', checkPermission('master_data', 'canRead'), getAllGenders);

/**
 * @route   GET /api/superadmin/masters/genders/:id
 * @desc    Get gender by ID
 * @access  Super Admin
 */
router.get('/masters/genders/:id', checkPermission('master_data', 'canRead'), getGenderById);

/**
 * @route   POST /api/superadmin/masters/genders
 * @desc    Create gender
 * @access  Super Admin
 */
router.post('/masters/genders', checkPermission('master_data', 'canWrite'), createGender);

/**
 * @route   PUT /api/superadmin/masters/genders/:id
 * @desc    Update gender
 * @access  Super Admin
 */
router.put('/masters/genders/:id', checkPermission('master_data', 'canUpdate'), updateGender);

/**
 * @route   DELETE /api/superadmin/masters/genders/:id
 * @desc    Delete gender
 * @access  Super Admin
 */
router.delete('/masters/genders/:id', checkPermission('master_data', 'canDelete'), deleteGender);

// ============================================
// MASTER DATA ROUTES - MARITAL STATUS
// ============================================

/**
 * @route   GET /api/superadmin/masters/marital-status
 * @desc    Get all marital statuses
 * @access  Super Admin
 */
router.get('/masters/marital-status', checkPermission('master_data', 'canRead'), getAllMaritalStatuses);

/**
 * @route   GET /api/superadmin/masters/marital-status/:id
 * @desc    Get marital status by ID
 * @access  Super Admin
 */
router.get('/masters/marital-status/:id', checkPermission('master_data', 'canRead'), getMaritalStatusById);

/**
 * @route   POST /api/superadmin/masters/marital-status
 * @desc    Create marital status
 * @access  Super Admin
 */
router.post('/masters/marital-status', checkPermission('master_data', 'canWrite'), createMaritalStatus);

/**
 * @route   PUT /api/superadmin/masters/marital-status/:id
 * @desc    Update marital status
 * @access  Super Admin
 */
router.put('/masters/marital-status/:id', checkPermission('master_data', 'canUpdate'), updateMaritalStatus);

/**
 * @route   DELETE /api/superadmin/masters/marital-status/:id
 * @desc    Delete marital status
 * @access  Super Admin
 */
router.delete('/masters/marital-status/:id', checkPermission('master_data', 'canDelete'), deleteMaritalStatus);

// ============================================
// MASTER DATA ROUTES - RELIGIONS
// ============================================

/**
 * @route   GET /api/superadmin/masters/religions
 * @desc    Get all religions
 * @access  Super Admin
 */
router.get('/masters/religions', checkPermission('master_data', 'canRead'), getAllReligions);

/**
 * @route   GET /api/superadmin/masters/religions/:id
 * @desc    Get religion by ID
 * @access  Super Admin
 */
router.get('/masters/religions/:id', checkPermission('master_data', 'canRead'), getReligionById);

/**
 * @route   POST /api/superadmin/masters/religions
 * @desc    Create religion
 * @access  Super Admin
 */
router.post('/masters/religions', checkPermission('master_data', 'canWrite'), createReligion);

/**
 * @route   PUT /api/superadmin/masters/religions/:id
 * @desc    Update religion
 * @access  Super Admin
 */
router.put('/masters/religions/:id', checkPermission('master_data', 'canUpdate'), updateReligion);

/**
 * @route   DELETE /api/superadmin/masters/religions/:id
 * @desc    Delete religion
 * @access  Super Admin
 */
router.delete('/masters/religions/:id', checkPermission('master_data', 'canDelete'), deleteReligion);

// ============================================
// MASTER DATA ROUTES - EDUCATION LEVELS
// ============================================

/**
 * @route   GET /api/superadmin/masters/education-levels
 * @desc    Get all education levels
 * @access  Super Admin
 */
router.get('/masters/education-levels', checkPermission('master_data', 'canRead'), getAllEducationLevels);

/**
 * @route   GET /api/superadmin/masters/education-levels/:id
 * @desc    Get education level by ID
 * @access  Super Admin
 */
router.get('/masters/education-levels/:id', checkPermission('master_data', 'canRead'), getEducationLevelById);

/**
 * @route   POST /api/superadmin/masters/education-levels
 * @desc    Create education level
 * @access  Super Admin
 */
router.post('/masters/education-levels', checkPermission('master_data', 'canWrite'), createEducationLevel);

/**
 * @route   PUT /api/superadmin/masters/education-levels/:id
 * @desc    Update education level
 * @access  Super Admin
 */
router.put('/masters/education-levels/:id', checkPermission('master_data', 'canUpdate'), updateEducationLevel);

/**
 * @route   DELETE /api/superadmin/masters/education-levels/:id
 * @desc    Delete education level
 * @access  Super Admin
 */
router.delete('/masters/education-levels/:id', checkPermission('master_data', 'canDelete'), deleteEducationLevel);

// ============================================
// MASTER DATA ROUTES - DOCUMENT TYPES
// ============================================

/**
 * @route   GET /api/superadmin/masters/document-types
 * @desc    Get all document types
 * @access  Super Admin
 */
router.get('/masters/document-types', checkPermission('master_data', 'canRead'), getAllDocumentTypes);

/**
 * @route   GET /api/superadmin/masters/document-types/:id
 * @desc    Get document type by ID
 * @access  Super Admin
 */
router.get('/masters/document-types/:id', checkPermission('master_data', 'canRead'), getDocumentTypeById);

/**
 * @route   POST /api/superadmin/masters/document-types
 * @desc    Create document type
 * @access  Super Admin
 */
router.post('/masters/document-types', checkPermission('master_data', 'canWrite'), createDocumentType);

/**
 * @route   PUT /api/superadmin/masters/document-types/:id
 * @desc    Update document type
 * @access  Super Admin
 */
router.put('/masters/document-types/:id', checkPermission('master_data', 'canUpdate'), updateDocumentType);

/**
 * @route   DELETE /api/superadmin/masters/document-types/:id
 * @desc    Delete document type
 * @access  Super Admin
 */
router.delete('/masters/document-types/:id', checkPermission('master_data', 'canDelete'), deleteDocumentType);

// ============================================
// MASTER DATA ROUTES - ORGANIZATION TYPES
// ============================================

/**
 * @route   GET /api/superadmin/masters/organization-types
 * @desc    Get all organization types
 * @access  Super Admin
 */
router.get('/masters/organization-types', checkPermission('master_data', 'canRead'), getAllOrganizationTypes);

/**
 * @route   GET /api/superadmin/masters/organization-types/:id
 * @desc    Get organization type by ID
 * @access  Super Admin
 */
router.get('/masters/organization-types/:id', checkPermission('master_data', 'canRead'), getOrganizationTypeById);

/**
 * @route   POST /api/superadmin/masters/organization-types
 * @desc    Create organization type
 * @access  Super Admin
 */
router.post('/masters/organization-types', checkPermission('master_data', 'canWrite'), createOrganizationType);

/**
 * @route   PUT /api/superadmin/masters/organization-types/:id
 * @desc    Update organization type
 * @access  Super Admin
 */
router.put('/masters/organization-types/:id', checkPermission('master_data', 'canUpdate'), updateOrganizationType);

/**
 * @route   DELETE /api/superadmin/masters/organization-types/:id
 * @desc    Delete organization type
 * @access  Super Admin
 */
router.delete('/masters/organization-types/:id', checkPermission('master_data', 'canDelete'), deleteOrganizationType);

// ============================================
// MASTER DATA ROUTES - INDUSTRY TYPES
// ============================================

/**
 * @route   GET /api/superadmin/masters/industry-types
 * @desc    Get all industry types
 * @access  Super Admin
 */
router.get('/masters/industry-types', checkPermission('master_data', 'canRead'), getAllIndustryTypes);

/**
 * @route   GET /api/superadmin/masters/industry-types/:id
 * @desc    Get industry type by ID
 * @access  Super Admin
 */
router.get('/masters/industry-types/:id', checkPermission('master_data', 'canRead'), getIndustryTypeById);

/**
 * @route   POST /api/superadmin/masters/industry-types
 * @desc    Create industry type
 * @access  Super Admin
 */
router.post('/masters/industry-types', checkPermission('master_data', 'canWrite'), createIndustryType);

/**
 * @route   PUT /api/superadmin/masters/industry-types/:id
 * @desc    Update industry type
 * @access  Super Admin
 */
router.put('/masters/industry-types/:id', checkPermission('master_data', 'canUpdate'), updateIndustryType);

/**
 * @route   DELETE /api/superadmin/masters/industry-types/:id
 * @desc    Delete industry type
 * @access  Super Admin
 */
router.delete('/masters/industry-types/:id', checkPermission('master_data', 'canDelete'), deleteIndustryType);

// ============================================
// MASTER DATA ROUTES - BUSINESS CATEGORIES
// ============================================

/**
 * @route   GET /api/superadmin/masters/business-categories
 * @desc    Get all business categories
 * @access  Super Admin
 */
router.get('/masters/business-categories', checkPermission('master_data', 'canRead'), getAllBusinessCategories);

/**
 * @route   GET /api/superadmin/masters/business-categories/:id
 * @desc    Get business category by ID
 * @access  Super Admin
 */
router.get('/masters/business-categories/:id', checkPermission('master_data', 'canRead'), getBusinessCategoryById);

/**
 * @route   POST /api/superadmin/masters/business-categories
 * @desc    Create business category
 * @access  Super Admin
 */
router.post('/masters/business-categories', checkPermission('master_data', 'canWrite'), createBusinessCategory);

/**
 * @route   PUT /api/superadmin/masters/business-categories/:id
 * @desc    Update business category
 * @access  Super Admin
 */
router.put('/masters/business-categories/:id', checkPermission('master_data', 'canUpdate'), updateBusinessCategory);

/**
 * @route   DELETE /api/superadmin/masters/business-categories/:id
 * @desc    Delete business category
 * @access  Super Admin
 */
router.delete('/masters/business-categories/:id', checkPermission('master_data', 'canDelete'), deleteBusinessCategory);

export default router;
