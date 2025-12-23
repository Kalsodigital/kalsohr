import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { deleteOldProfilePicture, deleteOldDocument } from '../middleware/upload.middleware';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all employees for the organization
 * GET /api/:orgSlug/employees
 */
export const getAllEmployees = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const {
      page = 1,
      limit = 10,
      search,
      departmentId,
      designationId,
      branchId,
      employmentTypeId,
      status,
      isActive,
      dateOfJoiningFrom,
      dateOfJoiningTo,
      salaryMin,
      salaryMax,
    } = req.query;

    // Build where clause
    const where: any = {
      organizationId,
    };

    // Search across multiple fields
    if (search) {
      where.OR = [
        { firstName: { contains: search as string } },
        { lastName: { contains: search as string } },
        { email: { contains: search as string } },
        { employeeCode: { contains: search as string } },
      ];
    }

    // Apply filters
    if (departmentId) where.departmentId = parseInt(departmentId as string);
    if (designationId) where.designationId = parseInt(designationId as string);
    if (branchId) where.branchId = parseInt(branchId as string);
    if (employmentTypeId) where.employmentTypeId = parseInt(employmentTypeId as string);
    if (status) where.status = status as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // Date range filter
    if (dateOfJoiningFrom || dateOfJoiningTo) {
      where.dateOfJoining = {};
      if (dateOfJoiningFrom) where.dateOfJoining.gte = new Date(dateOfJoiningFrom as string);
      if (dateOfJoiningTo) where.dateOfJoining.lte = new Date(dateOfJoiningTo as string);
    }

    // Salary range filter
    if (salaryMin || salaryMax) {
      where.salary = {};
      if (salaryMin) where.salary.gte = parseFloat(salaryMin as string);
      if (salaryMax) where.salary.lte = parseFloat(salaryMax as string);
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await prisma.employee.count({ where });

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'employees');

    // Get employees with relations
    const employees = await prisma.employee.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        dateOfJoining: true,
        dateOfLeaving: true,
        salary: true,
        status: true,
        isActive: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        designation: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        employmentType: {
          select: {
            id: true,
            name: true,
          },
        },
        genderMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        cityMaster: {
          select: {
            id: true,
            name: true,
            state: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            siblings: true,
            documents: true,
            attendance: true,
            leaveRequests: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limitNum);

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      // Fetch creator and updater details for all employees
      const userIds = new Set<number>();
      employees.forEach(emp => {
        if (emp.createdBy) userIds.add(emp.createdBy);
        if (emp.updatedBy) userIds.add(emp.updatedBy);
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

      // Attach creator and updater details to each employee
      const employeesWithAudit = employees.map(emp => ({
        ...emp,
        creator: emp.createdBy ? userMap.get(emp.createdBy) : null,
        updater: emp.updatedBy ? userMap.get(emp.updatedBy) : null,
      }));

      return sendSuccess(
        res,
        {
          employees: employeesWithAudit,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
          },
        },
        'Employees retrieved successfully'
      );
    }

    // User doesn't have permission - return without audit info
    return sendSuccess(
      res,
      {
        employees,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      },
      'Employees retrieved successfully'
    );
  } catch (error) {
    console.error('Get employees error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get employee by ID
 * GET /api/:orgSlug/employees/:id
 */
export const getEmployeeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const employee = await prisma.employee.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        designation: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        employmentType: {
          select: {
            id: true,
            name: true,
          },
        },
        genderMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        cityMaster: {
          select: {
            id: true,
            name: true,
            state: {
              select: {
                id: true,
                name: true,
                country: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        bloodGroupMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        religionMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        maritalStatusMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        educationLevelMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        siblings: {
          orderBy: {
            name: 'asc',
          },
        },
        organizationalPosition: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
        _count: {
          select: {
            documents: true,
            attendance: true,
            leaveBalances: true,
            leaveRequests: true,
          },
        },
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'employees');

    if (canViewAudit) {
      // Fetch creator and updater details
      const userIds: number[] = [];
      if (employee.createdBy) userIds.push(employee.createdBy);
      if (employee.updatedBy) userIds.push(employee.updatedBy);

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

      const employeeWithAudit = {
        ...employee,
        creator: employee.createdBy ? userMap.get(employee.createdBy) : null,
        updater: employee.updatedBy ? userMap.get(employee.updatedBy) : null,
      };

      return sendSuccess(res, { employee: employeeWithAudit }, 'Employee retrieved successfully');
    }

    // User doesn't have permission - return without audit info
    return sendSuccess(res, { employee }, 'Employee retrieved successfully');
  } catch (error) {
    console.error('Get employee error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create employee
 * POST /api/:orgSlug/employees
 */
export const createEmployee = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const data = req.body;

    // Parse FormData fields - when multipart/form-data is used, numeric fields come as strings
    const numericFields = [
      'departmentId', 'designationId', 'branchId', 'employmentTypeId',
      'genderId', 'userId', 'cityId', 'maritalStatusId', 'salary', 'organizationalPositionId'
    ];
    numericFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        const parsed = parseInt(data[field]);
        if (!isNaN(parsed)) {
          data[field] = parsed;
        }
      }
    });

    // Parse boolean fields
    if (data.isActive !== undefined && typeof data.isActive === 'string') {
      data.isActive = data.isActive === 'true';
    }

    // Parse siblings if it's a JSON string
    if (data.siblings && typeof data.siblings === 'string') {
      try {
        data.siblings = JSON.parse(data.siblings);
      } catch (e) {
        // If parsing fails, leave as is
      }
    }

    // Required field validation
    if (!data.firstName) {
      return sendError(res, 'First name is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!data.lastName) {
      return sendError(res, 'Last name is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!data.employeeCode) {
      return sendError(res, 'Employee code is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!data.email) {
      return sendError(res, 'Email is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!data.dateOfBirth) {
      return sendError(res, 'Date of birth is required', STATUS_CODES.BAD_REQUEST);
    }

    // Employment tab - all fields mandatory
    if (!data.departmentId) {
      return sendError(res, 'Department is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!data.designationId) {
      return sendError(res, 'Designation is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!data.branchId) {
      return sendError(res, 'Branch is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!data.employmentTypeId) {
      return sendError(res, 'Employment type is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!data.dateOfJoining) {
      return sendError(res, 'Date of joining is required', STATUS_CODES.BAD_REQUEST);
    }

    // Contact tab - required fields
    if (!data.currentAddress) {
      return sendError(res, 'Current address is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!data.cityId) {
      return sendError(res, 'City is required', STATUS_CODES.BAD_REQUEST);
    }

    // Check subscription plan employee limit
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscriptionPlan: true,
      },
    });

    if (organization?.subscriptionPlan?.maxEmployees) {
      const currentEmployeeCount = await prisma.employee.count({
        where: {
          organizationId,
          isActive: true,
        },
      });

      if (currentEmployeeCount >= organization.subscriptionPlan.maxEmployees) {
        return sendError(
          res,
          `Employee limit reached. Your ${organization.subscriptionPlan.name} plan allows a maximum of ${organization.subscriptionPlan.maxEmployees} employees. Please upgrade your plan to add more employees.`,
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Check employee code uniqueness within organization
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        organizationId,
        employeeCode: data.employeeCode,
      },
    });

    if (existingEmployee) {
      return sendError(
        res,
        'Employee with this code already exists in your organization',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate email format if provided
    if (data.email && !isValidEmail(data.email)) {
      return sendError(res, 'Invalid email format', STATUS_CODES.BAD_REQUEST);
    }

    // Validate phone number (10 digits) if provided
    if (data.phone && !isValidPhone(data.phone)) {
      return sendError(res, 'Phone number must be 10 digits', STATUS_CODES.BAD_REQUEST);
    }

    // Check phone number uniqueness within organization
    if (data.phone) {
      const existingPhone = await prisma.employee.findFirst({
        where: {
          organizationId,
          phone: data.phone,
        },
      });

      if (existingPhone) {
        return sendError(
          res,
          'Employee with this phone number already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Validate Aadhar (12 digits) if provided
    if (data.aadharNumber && !/^\d{12}$/.test(data.aadharNumber)) {
      return sendError(res, 'Aadhar number must be exactly 12 digits', STATUS_CODES.BAD_REQUEST);
    }

    // Validate PAN (10 alphanumeric) if provided
    if (data.panNumber && !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(data.panNumber)) {
      return sendError(res, 'Invalid PAN number format', STATUS_CODES.BAD_REQUEST);
    }

    // Validate IFSC code (11 alphanumeric) if provided
    if (data.bankIfscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.bankIfscCode)) {
      return sendError(res, 'Invalid IFSC code format', STATUS_CODES.BAD_REQUEST);
    }

    // Validate date of birth (at least 18 years old) if provided
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      const age = (new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 18) {
        return sendError(res, 'Employee must be at least 18 years old', STATUS_CODES.BAD_REQUEST);
      }
    }

    // Validate date of joining (not in future) if provided
    if (data.dateOfJoining) {
      const joiningDate = new Date(data.dateOfJoining);
      if (joiningDate > new Date()) {
        return sendError(res, 'Date of joining cannot be in the future', STATUS_CODES.BAD_REQUEST);
      }
    }

    // Validate date of leaving (must be after joining) if both provided
    if (data.dateOfJoining && data.dateOfLeaving) {
      const joiningDate = new Date(data.dateOfJoining);
      const leavingDate = new Date(data.dateOfLeaving);
      if (leavingDate <= joiningDate) {
        return sendError(
          res,
          'Date of leaving must be after date of joining',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Validate foreign keys if provided
    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: data.departmentId, organizationId },
      });
      if (!department) {
        return sendError(
          res,
          'Department not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    if (data.designationId) {
      const designation = await prisma.designation.findFirst({
        where: { id: data.designationId, organizationId },
      });
      if (!designation) {
        return sendError(
          res,
          'Designation not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, organizationId },
      });
      if (!branch) {
        return sendError(
          res,
          'Branch not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    if (data.employmentTypeId) {
      const employmentType = await prisma.employmentType.findFirst({
        where: { id: data.employmentTypeId, organizationId },
      });
      if (!employmentType) {
        return sendError(
          res,
          'Employment type not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    if (data.userId) {
      const user = await prisma.user.findFirst({
        where: { id: data.userId, organizationId },
      });
      if (!user) {
        return sendError(
          res,
          'User not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    if (data.organizationalPositionId) {
      const orgPosition = await prisma.organizationalPosition.findFirst({
        where: { id: data.organizationalPositionId, organizationId },
        include: {
          department: true,
          designation: true,
          _count: {
            select: { employees: true }
          }
        },
      });
      if (!orgPosition) {
        return sendError(
          res,
          'Organizational position not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }

      // Validate headcount - check if position is already full
      const currentEmployeeCount = orgPosition._count.employees;
      if (currentEmployeeCount >= orgPosition.headCount) {
        return sendError(
          res,
          `Cannot assign employee to "${orgPosition.title}". Position is full (${currentEmployeeCount}/${orgPosition.headCount} filled).`,
          STATUS_CODES.BAD_REQUEST
        );
      }

      // Optional: Validate that department and designation match the org position
      if (data.departmentId && data.departmentId !== orgPosition.departmentId) {
        console.warn(
          `Warning: Employee departmentId (${data.departmentId}) does not match organizational position departmentId (${orgPosition.departmentId})`
        );
      }
      if (data.designationId && data.designationId !== orgPosition.designationId) {
        console.warn(
          `Warning: Employee designationId (${data.designationId}) does not match organizational position designationId (${orgPosition.designationId})`
        );
      }
    }

    // Extract siblings data
    const siblingsData = data.siblings || [];
    delete data.siblings;

    // Convert date strings to ISO format if needed
    if (data.dateOfBirth && typeof data.dateOfBirth === 'string') {
      // If it's just a date (YYYY-MM-DD), convert to ISO timestamp
      if (!/T/.test(data.dateOfBirth)) {
        data.dateOfBirth = new Date(data.dateOfBirth + 'T00:00:00.000Z').toISOString();
      }
    }
    if (data.dateOfJoining && typeof data.dateOfJoining === 'string') {
      if (!/T/.test(data.dateOfJoining)) {
        data.dateOfJoining = new Date(data.dateOfJoining + 'T00:00:00.000Z').toISOString();
      }
    }
    if (data.dateOfLeaving && typeof data.dateOfLeaving === 'string') {
      if (!/T/.test(data.dateOfLeaving)) {
        data.dateOfLeaving = new Date(data.dateOfLeaving + 'T00:00:00.000Z').toISOString();
      }
    }

    // Handle file uploads (profile picture and ID proof)
    const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] };
    const profilePictureFile = files?.['profilePicture']?.[0];
    const idProofFile = files?.['idProof']?.[0];

    console.log('🔍 File upload debug - CREATE:', {
      hasProfilePicture: !!profilePictureFile,
      profilePictureFilename: profilePictureFile?.filename,
      hasIdProof: !!idProofFile,
      idProofFilename: idProofFile?.filename,
    });

    if (profilePictureFile) {
      data.profilePicture = `/uploads/profiles/${profilePictureFile.filename}`;
      console.log('✅ Profile picture set:', data.profilePicture);
    } else {
      console.log('⚠️  No profile picture uploaded');
      // Remove profilePicture if it's not a valid string (FormData can send empty objects)
      if (typeof data.profilePicture !== 'string' || data.profilePicture === '') {
        delete data.profilePicture;
      }
    }

    if (idProofFile) {
      data.idProof = `/uploads/documents/${idProofFile.filename}`;
      console.log('✅ ID proof set:', data.idProof);
    } else {
      console.log('⚠️  No ID proof uploaded');
      // Remove idProof if it's not a valid string
      if (typeof data.idProof !== 'string' || data.idProof === '') {
        delete data.idProof;
      }
    }

    // Convert date strings to proper DateTime format for Prisma
    const dateFields = ['dateOfBirth', 'dateOfJoining', 'dateOfLeaving'];
    dateFields.forEach((field) => {
      if (data[field] === '' || data[field] === null) {
        data[field] = undefined;
      } else if (data[field] && typeof data[field] === 'string') {
        // Convert date string to ISO DateTime format
        data[field] = new Date(data[field]).toISOString();
      }
    });

    // Create employee with siblings in transaction
    const employee = await prisma.$transaction(async (tx) => {
      // Create employee
      const newEmployee = await tx.employee.create({
        data: {
          ...data,
          organizationId,
          status: data.status || 'Active',
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          department: { select: { id: true, name: true, code: true } },
          designation: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
          employmentType: { select: { id: true, name: true } },
          genderMaster: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });

      // Create siblings if provided
      if (siblingsData.length > 0) {
        await tx.employeeSibling.createMany({
          data: siblingsData.map((sibling: any) => {
            // Convert sibling dateOfBirth to ISO format if needed
            if (sibling.dateOfBirth && typeof sibling.dateOfBirth === 'string' && !/T/.test(sibling.dateOfBirth)) {
              sibling.dateOfBirth = new Date(sibling.dateOfBirth + 'T00:00:00.000Z').toISOString();
            }
            return {
              ...sibling,
              employeeId: newEmployee.id,
              organizationId,
            };
          }),
        });
      }

      return newEmployee;
    });

    return sendSuccess(res, { employee }, 'Employee created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create employee error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update employee
 * PUT /api/:orgSlug/employees/:id
 */
export const updateEmployee = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const data = req.body;

    // Parse FormData fields - when multipart/form-data is used, numeric fields come as strings
    const numericFields = [
      'departmentId', 'designationId', 'branchId', 'employmentTypeId',
      'genderId', 'userId', 'cityId', 'maritalStatusId', 'salary', 'organizationalPositionId'
    ];
    numericFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        const parsed = parseInt(data[field]);
        if (!isNaN(parsed)) {
          data[field] = parsed;
        }
      }
    });

    // Parse boolean fields
    if (data.isActive !== undefined && typeof data.isActive === 'string') {
      data.isActive = data.isActive === 'true';
    }

    // Parse siblings if it's a JSON string
    if (data.siblings && typeof data.siblings === 'string') {
      try {
        data.siblings = JSON.parse(data.siblings);
      } catch (e) {
        // If parsing fails, leave as is
      }
    }

    // Check if employee exists
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existingEmployee) {
      return sendError(res, 'Employee not found', STATUS_CODES.NOT_FOUND);
    }

    // Check employee code uniqueness if being updated
    if (data.employeeCode && data.employeeCode !== existingEmployee.employeeCode) {
      const duplicateCode = await prisma.employee.findFirst({
        where: {
          organizationId,
          employeeCode: data.employeeCode,
          id: { not: parseInt(id) },
        },
      });

      if (duplicateCode) {
        return sendError(
          res,
          'Employee with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Validate email format if being updated
    if (data.email && !isValidEmail(data.email)) {
      return sendError(res, 'Invalid email format', STATUS_CODES.BAD_REQUEST);
    }

    // Validate phone number if being updated
    if (data.phone && !isValidPhone(data.phone)) {
      return sendError(res, 'Phone number must be 10 digits', STATUS_CODES.BAD_REQUEST);
    }

    // Check phone number uniqueness if being updated
    if (data.phone && data.phone !== existingEmployee.phone) {
      const duplicatePhone = await prisma.employee.findFirst({
        where: {
          organizationId,
          phone: data.phone,
          id: { not: parseInt(id) },
        },
      });

      if (duplicatePhone) {
        return sendError(
          res,
          'Employee with this phone number already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Validate Aadhar if being updated
    if (data.aadharNumber && !/^\d{12}$/.test(data.aadharNumber)) {
      return sendError(res, 'Aadhar number must be exactly 12 digits', STATUS_CODES.BAD_REQUEST);
    }

    // Validate PAN if being updated
    if (data.panNumber && !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(data.panNumber)) {
      return sendError(res, 'Invalid PAN number format', STATUS_CODES.BAD_REQUEST);
    }

    // Validate IFSC code if being updated
    if (data.bankIfscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.bankIfscCode)) {
      return sendError(res, 'Invalid IFSC code format', STATUS_CODES.BAD_REQUEST);
    }

    // Validate foreign keys if being updated
    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: data.departmentId, organizationId },
      });
      if (!department) {
        return sendError(
          res,
          'Department not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    if (data.designationId) {
      const designation = await prisma.designation.findFirst({
        where: { id: data.designationId, organizationId },
      });
      if (!designation) {
        return sendError(
          res,
          'Designation not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, organizationId },
      });
      if (!branch) {
        return sendError(
          res,
          'Branch not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    if (data.organizationalPositionId) {
      const orgPosition = await prisma.organizationalPosition.findFirst({
        where: { id: data.organizationalPositionId, organizationId },
        include: {
          department: true,
          designation: true,
          _count: {
            select: { employees: true }
          }
        },
      });
      if (!orgPosition) {
        return sendError(
          res,
          'Organizational position not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }

      // Validate headcount - only check if employee is moving to a different position
      const employeeId = parseInt(id);
      if (existingEmployee.organizationalPositionId !== data.organizationalPositionId) {
        // Employee is changing to a different position, check if new position has space
        const currentEmployeeCount = orgPosition._count.employees;
        if (currentEmployeeCount >= orgPosition.headCount) {
          return sendError(
            res,
            `Cannot assign employee to "${orgPosition.title}". Position is full (${currentEmployeeCount}/${orgPosition.headCount} filled).`,
            STATUS_CODES.BAD_REQUEST
          );
        }
      }
      // If employee is staying in same position (or no change), no headcount validation needed

      // Optional: Validate that department and designation match the org position
      if (data.departmentId && data.departmentId !== orgPosition.departmentId) {
        console.warn(
          `Warning: Employee departmentId (${data.departmentId}) does not match organizational position departmentId (${orgPosition.departmentId})`
        );
      }
      if (data.designationId && data.designationId !== orgPosition.designationId) {
        console.warn(
          `Warning: Employee designationId (${data.designationId}) does not match organizational position designationId (${orgPosition.designationId})`
        );
      }
    }

    // Extract siblings data if provided
    const siblingsData = data.siblings;
    delete data.siblings;
    delete data.organizationId; // Don't allow changing organization

    // Handle file uploads (profile picture and ID proof)
    const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] };
    const profilePictureFile = files?.['profilePicture']?.[0];
    const idProofFile = files?.['idProof']?.[0];

    console.log('🔍 File upload debug - UPDATE:', {
      hasProfilePicture: !!profilePictureFile,
      profilePictureFilename: profilePictureFile?.filename,
      hasIdProof: !!idProofFile,
      idProofFilename: idProofFile?.filename,
    });

    if (profilePictureFile) {
      console.log('✅ Profile picture file received, deleting old and setting new');
      // Delete old profile picture if exists
      if (existingEmployee.profilePicture) {
        deleteOldProfilePicture(existingEmployee.profilePicture);
      }
      // Set new profile picture path
      data.profilePicture = `/uploads/profiles/${profilePictureFile.filename}`;
      console.log('✅ Profile picture set:', data.profilePicture);
    } else {
      console.log('⚠️  No profile picture uploaded');
      // Remove profilePicture if it's not a valid string (FormData can send empty objects)
      if (typeof data.profilePicture !== 'string' || data.profilePicture === '') {
        delete data.profilePicture;
      }
    }

    if (idProofFile) {
      console.log('✅ ID proof file received, deleting old and setting new');
      // Delete old ID proof if exists
      if (existingEmployee.idProof) {
        deleteOldDocument(existingEmployee.idProof);
      }
      // Set new ID proof path
      data.idProof = `/uploads/documents/${idProofFile.filename}`;
      console.log('✅ ID proof set:', data.idProof);
    } else {
      console.log('⚠️  No ID proof uploaded');
      // Handle explicit removal (when idProof is null or empty string)
      if (data.idProof === null || data.idProof === '') {
        // Delete old ID proof file if exists
        if (existingEmployee.idProof) {
          deleteOldDocument(existingEmployee.idProof);
        }
        data.idProof = null;
      } else if (typeof data.idProof !== 'string' || data.idProof === '') {
        delete data.idProof;
      }
    }

    // Convert date strings to proper DateTime format for Prisma
    const dateFields = ['dateOfBirth', 'dateOfJoining', 'dateOfLeaving'];
    dateFields.forEach((field) => {
      if (data[field] === '' || data[field] === null) {
        data[field] = undefined;
      } else if (data[field] && typeof data[field] === 'string') {
        // Convert date string to ISO DateTime format
        data[field] = new Date(data[field]).toISOString();
      }
    });

    // Check subscription plan employee limit when activating a deactivated employee
    if (data.isActive === true && existingEmployee.isActive === false) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          subscriptionPlan: true,
        },
      });

      if (organization?.subscriptionPlan?.maxEmployees) {
        const currentEmployeeCount = await prisma.employee.count({
          where: {
            organizationId,
            isActive: true,
          },
        });

        if (currentEmployeeCount >= organization.subscriptionPlan.maxEmployees) {
          return sendError(
            res,
            `Employee limit reached. Your ${organization.subscriptionPlan.name} plan allows a maximum of ${organization.subscriptionPlan.maxEmployees} active employees. Please upgrade your plan or deactivate another employee first.`,
            STATUS_CODES.BAD_REQUEST
          );
        }
      }
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        updatedBy: userId,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        designation: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        employmentType: { select: { id: true, name: true } },
        genderMaster: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        siblings: true,
      },
    });

    // Update siblings if provided (delete all and recreate)
    if (siblingsData !== undefined) {
      await prisma.$transaction(async (tx) => {
        // Delete existing siblings
        await tx.employeeSibling.deleteMany({
          where: { employeeId: parseInt(id) },
        });

        // Create new siblings
        if (siblingsData.length > 0) {
          await tx.employeeSibling.createMany({
            data: siblingsData.map((sibling: any) => ({
              ...sibling,
              employeeId: parseInt(id),
              organizationId,
            })),
          });
        }
      });
    }

    return sendSuccess(res, { employee }, 'Employee updated successfully');
  } catch (error) {
    console.error('Update employee error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete employee
 * DELETE /api/:orgSlug/employees/:id
 */
export const deleteEmployee = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if employee exists
    const employee = await prisma.employee.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if employee is a department head
    const isDepartmentHead = await prisma.department.findFirst({
      where: { headEmployeeId: parseInt(id) },
    });

    if (isDepartmentHead) {
      return sendError(
        res,
        'Cannot delete employee who is assigned as a department head. Please reassign the department head first.',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if employee is a branch manager
    const isBranchManager = await prisma.branch.findFirst({
      where: { managerId: parseInt(id) },
    });

    if (isBranchManager) {
      return sendError(
        res,
        'Cannot delete employee who is assigned as a branch manager. Please reassign the branch manager first.',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Clean up files before deleting employee
    if (employee.profilePicture) {
      deleteOldProfilePicture(employee.profilePicture);
    }
    if (employee.idProof) {
      deleteOldDocument(employee.idProof);
    }

    // Delete employee (cascade will handle siblings, documents, attendance, leave)
    await prisma.employee.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Employee deleted successfully');
  } catch (error) {
    console.error('Delete employee error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Bulk export employees to CSV
 * GET /api/:orgSlug/employees/export/csv
 */
export const bulkExportEmployees = async (req: Request, res: Response): Promise<any> => {
  try {
    const organizationId = (req as any).organizationId;
    const {
      search,
      departmentId,
      designationId,
      branchId,
      employmentTypeId,
      status,
      isActive,
    } = req.query;

    // Build where clause (same as getAllEmployees)
    const where: any = { organizationId };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { employeeCode: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (departmentId) where.departmentId = parseInt(departmentId as string);
    if (designationId) where.designationId = parseInt(designationId as string);
    if (branchId) where.branchId = parseInt(branchId as string);
    if (employmentTypeId) where.employmentTypeId = parseInt(employmentTypeId as string);
    if (status) where.status = status as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // Get all matching employees
    const employees = await prisma.employee.findMany({
      where,
      select: {
        employeeCode: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfJoining: true,
        status: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });

    // Generate CSV
    const csvHeaders = [
      'Employee Code',
      'First Name',
      'Middle Name',
      'Last Name',
      'Email',
      'Phone',
      'Department',
      'Designation',
      'Branch',
      'Date of Joining',
      'Status',
    ].join(',');

    const csvRows = employees.map((emp) => [
      emp.employeeCode,
      emp.firstName,
      emp.middleName || '',
      emp.lastName || '',
      emp.email || '',
      emp.phone || '',
      emp.department?.name || '',
      emp.designation?.name || '',
      emp.branch?.name || '',
      emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : '',
      emp.status,
    ].join(','));

    const csv = [csvHeaders, ...csvRows].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=employees_${Date.now()}.csv`);

    return res.send(csv);
  } catch (error) {
    console.error('Bulk export employees error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Bulk update employee status
 * PATCH /api/:orgSlug/employees/bulk-status
 */
export const bulkUpdateEmployeeStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { employeeIds, status, isActive } = req.body;

    // Validation
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return sendError(res, 'Employee IDs array is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!status) {
      return sendError(res, 'Status is required', STATUS_CODES.BAD_REQUEST);
    }

    const validStatuses = ['Active', 'On Leave', 'Terminated', 'Resigned'];
    if (!validStatuses.includes(status)) {
      return sendError(
        res,
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Verify all employees exist and belong to organization
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds.map((id: any) => parseInt(id)) },
        organizationId,
      },
    });

    if (employees.length !== employeeIds.length) {
      return sendError(
        res,
        'One or more employees not found or do not belong to this organization',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Update status
    const updateData: any = { status, updatedBy: userId };
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const result = await prisma.employee.updateMany({
      where: {
        id: { in: employeeIds.map((id: any) => parseInt(id)) },
        organizationId,
      },
      data: updateData,
    });

    return sendSuccess(
      res,
      { count: result.count },
      `${result.count} employee(s) updated successfully`
    );
  } catch (error) {
    console.error('Bulk update employee status error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Helper function to validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper function to validate phone number (10 digits)
 */
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
}
