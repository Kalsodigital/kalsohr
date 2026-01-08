import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { deleteOldFile } from '../middleware/upload.middleware';
import { canViewAuditInfo } from '../utils/permissions';

// Validation constants
const VALID_CANDIDATE_STATUSES = ['New', 'In Process', 'Selected', 'Rejected', 'On Hold'];
const VALID_SOURCES = ['LinkedIn', 'Naukri', 'Indeed', 'Referral', 'Direct', 'Career Page', 'Other'];

/**
 * Get all candidates for the organization
 * GET /api/:orgSlug/recruitment/candidates
 */
export const getAllCandidates = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const {
      page = 1,
      limit = 10,
      search,
      status,
      source,
      experienceMin,
      experienceMax,
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
        { phone: { contains: search as string } },
      ];
    }

    // Apply filters
    if (status) where.status = status as string;
    if (source) where.source = source as string;

    // Experience range filter
    if (experienceMin || experienceMax) {
      where.totalExperience = {};
      if (experienceMin) where.totalExperience.gte = parseInt(experienceMin as string);
      if (experienceMax) where.totalExperience.lte = parseInt(experienceMax as string);
    }

    // Expected salary range filter
    if (salaryMin || salaryMax) {
      where.expectedSalary = {};
      if (salaryMin) where.expectedSalary.gte = parseFloat(salaryMin as string);
      if (salaryMax) where.expectedSalary.lte = parseFloat(salaryMax as string);
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await prisma.candidate.count({ where });

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'recruitment');

    // Get candidates with relations
    const candidates = await prisma.candidate.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profilePicture: true,
        resumePath: true,
        totalExperience: true,
        currentCompany: true,
        currentSalary: true,
        expectedSalary: true,
        noticePeriod: true,
        skills: true,
        qualifications: true,
        source: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        educationLevel: true,
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
        maritalStatusMaster: {
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
        educationLevelMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limitNum);

    // Fetch creator and updater details if user has permission
    let candidatesWithAudit = candidates;
    if (canViewAudit) {
      const userIds = new Set<number>();
      candidates.forEach(candidate => {
        if (candidate.createdBy) userIds.add(candidate.createdBy);
        if (candidate.updatedBy) userIds.add(candidate.updatedBy);
      });

      if (userIds.size > 0) {
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

        candidatesWithAudit = candidates.map(candidate => ({
          ...candidate,
          creator: candidate.createdBy ? userMap.get(candidate.createdBy) : null,
          updater: candidate.updatedBy ? userMap.get(candidate.updatedBy) : null,
        }));
      }
    }

    // Calculate stats
    const stats = {
      total,
      new: await prisma.candidate.count({ where: { ...where, status: 'New' } }),
      inProcess: await prisma.candidate.count({ where: { ...where, status: 'In Process' } }),
      selected: await prisma.candidate.count({ where: { ...where, status: 'Selected' } }),
      rejected: await prisma.candidate.count({ where: { ...where, status: 'Rejected' } }),
    };

    return sendSuccess(
      res,
      {
        candidates: candidatesWithAudit,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
        stats,
      },
      'Candidates retrieved successfully'
    );
  } catch (error) {
    console.error('Get candidates error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get candidate by ID
 * GET /api/:orgSlug/recruitment/candidates/:id
 */
export const getCandidateById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const canViewAudit = await canViewAuditInfo(user, 'recruitment');

    const candidate = await prisma.candidate.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        applications: {
          include: {
            jobPosition: {
              select: {
                id: true,
                title: true,
                code: true,
                status: true,
              },
            },
            interviewSchedules: {
              select: {
                id: true,
                roundName: true,
                interviewDate: true,
                status: true,
                result: true,
              },
            },
          },
        },
        cityMaster: {
          include: {
            state: {
              include: {
                country: true,
              },
            },
          },
        },
        maritalStatusMaster: true,
        genderMaster: true,
        educationLevelMaster: true,
      },
    });

    if (!candidate) {
      return sendError(res, 'Candidate not found', STATUS_CODES.NOT_FOUND);
    }

    // Fetch creator and updater details if permitted
    let result: any = candidate;
    if (canViewAudit && (candidate.createdBy || candidate.updatedBy)) {
      const userIds = [];
      if (candidate.createdBy) userIds.push(candidate.createdBy);
      if (candidate.updatedBy) userIds.push(candidate.updatedBy);

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

      result = {
        ...candidate,
        creator: candidate.createdBy ? userMap.get(candidate.createdBy) : null,
        updater: candidate.updatedBy ? userMap.get(candidate.updatedBy) : null,
      };
    }

    return sendSuccess(res, { candidate: result }, 'Candidate retrieved successfully');
  } catch (error) {
    console.error('Get candidate error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create candidate
 * POST /api/:orgSlug/recruitment/candidates
 */
export const createCandidate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const {
      firstName,
      lastName,
      email,
      phone,
      alternatePhone,
      dateOfBirth,
      genderId,
      maritalStatusId,
      currentCompany,
      totalExperience,
      currentSalary,
      expectedSalary,
      noticePeriod,
      skills,
      qualifications,
      educationLevel,
      fatherStatus,
      fatherName,
      fatherOccupation,
      fatherContact,
      motherStatus,
      motherName,
      motherOccupation,
      motherContact,
      familyAddress,
      emergencyContactName,
      emergencyContactPhone,
      source,
      referredBy,
      jobPositionId,
      currentAddress,
      permanentAddress,
      cityId,
      postalCode,
      notes,
    } = req.body;

    // Validation
    if (!firstName) {
      return sendError(res, 'First name is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!email) {
      return sendError(res, 'Email is required', STATUS_CODES.BAD_REQUEST);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Invalid email format', STATUS_CODES.BAD_REQUEST);
    }

    // Check if email already exists for this organization
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        email,
        organizationId,
      },
    });

    if (existingCandidate) {
      return sendError(
        res,
        'A candidate with this email already exists',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate status
    const status = req.body.status || 'New';
    if (!VALID_CANDIDATE_STATUSES.includes(status)) {
      return sendError(
        res,
        `Invalid status. Must be one of: ${VALID_CANDIDATE_STATUSES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate source
    if (source && !VALID_SOURCES.includes(source)) {
      return sendError(
        res,
        `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate numeric fields
    if (totalExperience !== undefined && totalExperience < 0) {
      return sendError(res, 'Total experience cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    if (currentSalary !== undefined && currentSalary < 0) {
      return sendError(res, 'Current salary cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    if (expectedSalary !== undefined && expectedSalary < 0) {
      return sendError(res, 'Expected salary cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    if (noticePeriod !== undefined && noticePeriod < 0) {
      return sendError(res, 'Notice period cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const resumePath = files?.resume?.[0]?.filename ? `/uploads/candidates/resumes/${files.resume[0].filename}` : null;
    const profilePicture = files?.profilePicture?.[0]?.filename ? `/uploads/candidates/profiles/${files.profilePicture[0].filename}` : null;

    // Create candidate
    const candidate = await prisma.candidate.create({
      data: {
        organizationId,
        firstName,
        lastName,
        email,
        phone,
        alternatePhone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        genderId: genderId ? parseInt(genderId) : null,
        maritalStatusId: maritalStatusId ? parseInt(maritalStatusId) : null,
        resumePath,
        profilePicture,
        totalExperience: totalExperience ? parseInt(totalExperience) : null,
        currentCompany,
        currentSalary: currentSalary ? parseFloat(currentSalary) : null,
        expectedSalary: expectedSalary ? parseFloat(expectedSalary) : null,
        noticePeriod: noticePeriod ? parseInt(noticePeriod) : null,
        skills,
        qualifications,
        educationLevel,
        fatherStatus,
        fatherName,
        fatherOccupation,
        fatherContact,
        motherStatus,
        motherName,
        motherOccupation,
        motherContact,
        familyAddress,
        emergencyContactName,
        emergencyContactPhone,
        source,
        referredBy,
        currentAddress,
        permanentAddress,
        cityId: cityId ? parseInt(cityId) : null,
        postalCode,
        notes,
        status,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        genderMaster: {
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
      },
    });

    // Auto-create application if job position is provided
    let application = null;
    if (jobPositionId) {
      // Verify job position exists and is open
      const jobPosition = await prisma.jobPosition.findFirst({
        where: {
          id: parseInt(jobPositionId),
          organizationId,
          status: 'Open',
        },
      });

      if (jobPosition) {
        // Create application
        application = await prisma.application.create({
          data: {
            organizationId,
            candidateId: candidate.id,
            jobPositionId: parseInt(jobPositionId),
            appliedDate: new Date(),
            status: 'Applied',
            notes: 'Auto-created from candidate registration',
            createdBy: userId,
            updatedBy: userId,
          },
          include: {
            jobPosition: {
              select: {
                id: true,
                title: true,
                code: true,
              },
            },
          },
        });
      }
    }

    return sendSuccess(
      res,
      {
        candidate,
        application: application || undefined,
        message: application
          ? `Candidate created successfully and application submitted for ${application.jobPosition.title}`
          : 'Candidate created successfully'
      },
      'Candidate created successfully',
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error('Create candidate error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update candidate
 * PUT /api/:orgSlug/recruitment/candidates/:id
 */
export const updateCandidate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      alternatePhone,
      dateOfBirth,
      genderId,
      maritalStatusId,
      currentCompany,
      totalExperience,
      currentSalary,
      expectedSalary,
      noticePeriod,
      skills,
      qualifications,
      educationLevel,
      educationLevelId,
      fatherStatus,
      fatherName,
      fatherOccupation,
      fatherContact,
      motherStatus,
      motherName,
      motherOccupation,
      motherContact,
      familyAddress,
      emergencyContactName,
      emergencyContactPhone,
      source,
      referredBy,
      currentAddress,
      permanentAddress,
      cityId,
      postalCode,
      notes,
      status,
    } = req.body;

    // Check if candidate exists
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existingCandidate) {
      return sendError(res, 'Candidate not found', STATUS_CODES.NOT_FOUND);
    }

    // Validation
    if (!firstName) {
      return sendError(res, 'First name is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!email) {
      return sendError(res, 'Email is required', STATUS_CODES.BAD_REQUEST);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Invalid email format', STATUS_CODES.BAD_REQUEST);
    }

    // Check if email already exists for another candidate
    if (email !== existingCandidate.email) {
      const emailExists = await prisma.candidate.findFirst({
        where: {
          email,
          organizationId,
          id: { not: parseInt(id) },
        },
      });

      if (emailExists) {
        return sendError(
          res,
          'A candidate with this email already exists',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Validate status
    if (status && !VALID_CANDIDATE_STATUSES.includes(status)) {
      return sendError(
        res,
        `Invalid status. Must be one of: ${VALID_CANDIDATE_STATUSES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate source
    if (source && !VALID_SOURCES.includes(source)) {
      return sendError(
        res,
        `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate numeric fields
    if (totalExperience !== undefined && totalExperience < 0) {
      return sendError(res, 'Total experience cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    if (currentSalary !== undefined && currentSalary < 0) {
      return sendError(res, 'Current salary cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    if (expectedSalary !== undefined && expectedSalary < 0) {
      return sendError(res, 'Expected salary cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    if (noticePeriod !== undefined && noticePeriod < 0) {
      return sendError(res, 'Notice period cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: any = {
      firstName,
      lastName,
      email,
      phone,
      alternatePhone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      genderId: genderId ? parseInt(genderId) : null,
      maritalStatusId: maritalStatusId ? parseInt(maritalStatusId) : null,
      currentCompany,
      totalExperience: totalExperience ? parseInt(totalExperience) : null,
      currentSalary: currentSalary ? parseFloat(currentSalary) : null,
      expectedSalary: expectedSalary ? parseFloat(expectedSalary) : null,
      noticePeriod: noticePeriod ? parseInt(noticePeriod) : null,
      skills,
      qualifications,
      educationLevel,
      educationLevelId: educationLevelId ? parseInt(educationLevelId) : null,
      fatherStatus,
      fatherName,
      fatherOccupation,
      fatherContact,
      motherStatus,
      motherName,
      motherOccupation,
      motherContact,
      familyAddress,
      emergencyContactName,
      emergencyContactPhone,
      source,
      referredBy,
      currentAddress,
      permanentAddress,
      cityId: cityId ? parseInt(cityId) : null,
      postalCode,
      notes,
      status,
      updatedBy: userId,
    };

    // Update resume if new file uploaded
    if (files?.resume?.[0]) {
      if (existingCandidate.resumePath) {
        // Extract filename from path if it's a full path
        const oldFilename = existingCandidate.resumePath.split('/').pop() || existingCandidate.resumePath;
        await deleteOldFile(oldFilename, 'candidates/resumes');
      }
      updateData.resumePath = `/uploads/candidates/resumes/${files.resume[0].filename}`;
    }

    // Update profile picture if new file uploaded
    if (files?.profilePicture?.[0]) {
      if (existingCandidate.profilePicture) {
        // Extract filename from path if it's a full path
        const oldFilename = existingCandidate.profilePicture.split('/').pop() || existingCandidate.profilePicture;
        await deleteOldFile(oldFilename, 'candidates/profiles');
      }
      updateData.profilePicture = `/uploads/candidates/profiles/${files.profilePicture[0].filename}`;
    }

    // Update candidate
    const candidate = await prisma.candidate.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        genderMaster: {
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
      },
    });

    return sendSuccess(res, { candidate }, 'Candidate updated successfully');
  } catch (error) {
    console.error('Update candidate error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete candidate
 * DELETE /api/:orgSlug/recruitment/candidates/:id
 */
export const deleteCandidate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if candidate exists
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        applications: {
          where: {
            status: {
              in: ['Applied', 'Shortlisted', 'Interview Scheduled'],
            },
          },
        },
      },
    });

    if (!candidate) {
      return sendError(res, 'Candidate not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if candidate has active applications
    if (candidate.applications && candidate.applications.length > 0) {
      return sendError(
        res,
        `Cannot delete candidate. They have ${candidate.applications.length} active application(s). Please reject or complete all applications first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Delete files if they exist
    if (candidate.resumePath) {
      // Extract filename from path if it's a full path
      const resumeFilename = candidate.resumePath.split('/').pop() || candidate.resumePath;
      await deleteOldFile(resumeFilename, 'candidates/resumes');
    }
    if (candidate.profilePicture) {
      // Extract filename from path if it's a full path
      const profileFilename = candidate.profilePicture.split('/').pop() || candidate.profilePicture;
      await deleteOldFile(profileFilename, 'candidates/profiles');
    }

    // Delete candidate
    await prisma.candidate.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Candidate deleted successfully');
  } catch (error) {
    console.error('Delete candidate error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Bulk export candidates to CSV
 * GET /api/:orgSlug/recruitment/candidates/export/csv
 */
export const bulkExportCandidates = async (req: Request, res: Response): Promise<any> => {
  try {
    const organizationId = (req as any).organizationId;
    const { search, status, source, experienceMin, experienceMax, salaryMin, salaryMax } = req.query;

    // Build where clause (same as getAllCandidates)
    const where: any = {
      organizationId,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string } },
        { lastName: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } },
      ];
    }

    if (status) where.status = status as string;
    if (source) where.source = source as string;

    if (experienceMin || experienceMax) {
      where.totalExperience = {};
      if (experienceMin) where.totalExperience.gte = parseInt(experienceMin as string);
      if (experienceMax) where.totalExperience.lte = parseInt(experienceMax as string);
    }

    if (salaryMin || salaryMax) {
      where.expectedSalary = {};
      if (salaryMin) where.expectedSalary.gte = parseFloat(salaryMin as string);
      if (salaryMax) where.expectedSalary.lte = parseFloat(salaryMax as string);
    }

    // Get all candidates matching filters
    const candidates = await prisma.candidate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        totalExperience: true,
        currentCompany: true,
        currentSalary: true,
        expectedSalary: true,
        noticePeriod: true,
        skills: true,
        qualifications: true,
        source: true,
        status: true,
        createdAt: true,
      },
    });

    // Convert to CSV
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Experience (Years)',
      'Current Company',
      'Current Salary',
      'Expected Salary',
      'Notice Period (Days)',
      'Skills',
      'Qualifications',
      'Source',
      'Status',
      'Created At',
    ];

    const rows = candidates.map(candidate => [
      candidate.firstName || '',
      candidate.lastName || '',
      candidate.email || '',
      candidate.phone || '',
      candidate.totalExperience || '',
      candidate.currentCompany || '',
      candidate.currentSalary || '',
      candidate.expectedSalary || '',
      candidate.noticePeriod || '',
      candidate.skills || '',
      candidate.qualifications || '',
      candidate.source || '',
      candidate.status || '',
      new Date(candidate.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=candidates.csv');

    return res.send(csv);
  } catch (error) {
    console.error('Export candidates error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
