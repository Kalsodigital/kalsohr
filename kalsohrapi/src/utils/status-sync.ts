import { prisma } from '../index';

/**
 * Status Sync Utilities
 * Handles automatic status synchronization between Candidate, Application, and Interview entities
 */

// ==================== Candidate Status Sync ====================

/**
 * Updates candidate status based on all their applications
 * Called whenever an application status changes
 */
export async function updateCandidateStatusFromApplications(
  candidateId: number,
  organizationId: number,
  triggeredBy?: number
): Promise<void> {
  try {
    // Get current candidate
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      console.error('Candidate not found:', candidateId);
      return;
    }

    // Get all applications for this candidate
    const applications = await prisma.application.findMany({
      where: { candidateId, organizationId },
    });

    if (applications.length === 0) {
      // No applications, keep as New
      return;
    }

    const oldStatus = candidate.status;
    let newStatus = candidate.status;

    // Rule 1: If ANY application is "Selected" → Candidate = "Selected"
    const hasSelected = applications.some((app) => app.status === 'Selected');
    if (hasSelected) {
      newStatus = 'Selected';
    }
    // Rule 2: If ALL applications are "Rejected" → Candidate = "Rejected"
    else if (applications.every((app) => app.status === 'Rejected')) {
      newStatus = 'Rejected';
    }
    // Rule 3: If ANY application is active (not rejected/selected) → Candidate = "In Process"
    else if (
      applications.some((app) =>
        ['Applied', 'Shortlisted', 'Interview Scheduled'].includes(app.status)
      )
    ) {
      newStatus = 'In Process';
    }

    // Update candidate status if changed
    if (oldStatus !== newStatus) {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          status: newStatus,
          updatedBy: triggeredBy || null,
        },
      });

      // Log the status change
      await logStatusChange({
        entityType: 'Candidate',
        entityId: candidateId,
        oldStatus,
        newStatus,
        changedBy: triggeredBy || null,
        reason: 'Auto-updated based on application statuses',
      });

      console.log(
        `Candidate ${candidateId} status updated: ${oldStatus} → ${newStatus}`
      );
    }
  } catch (error) {
    console.error('Error updating candidate status:', error);
  }
}

// ==================== Application Status Sync ====================

/**
 * Updates application status based on interview result
 * Called when an interview is completed with a result
 */
export async function updateApplicationFromInterview(
  applicationId: number,
  interviewResult: string,
  interviewRound: string,
  triggeredBy?: number
): Promise<void> {
  try {
    // Get current application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      console.error('Application not found:', applicationId);
      return;
    }

    const oldStatus = application.status;
    let newStatus = application.status;
    let reason = '';

    // Handle interview results
    if (interviewResult === 'Fail') {
      newStatus = 'Rejected';
      reason = `Failed ${interviewRound} interview`;
    } else if (interviewResult === 'Pass') {
      // Get all interviews for this application to determine next step
      const interviews = await prisma.interviewSchedule.findMany({
        where: { applicationId },
        orderBy: { interviewDate: 'desc' },
      });

      const completedInterviews = interviews.filter(
        (i) => i.status === 'Completed' && i.result === 'Pass'
      );

      // Check if this is the final round
      const isFinalRound =
        interviewRound.toLowerCase().includes('final') ||
        interviewRound.toLowerCase().includes('hr') ||
        completedInterviews.length >= 3; // Assume 3+ rounds means final

      if (isFinalRound) {
        newStatus = 'Selected';
        reason = `Passed all interview rounds including ${interviewRound}`;
      } else {
        newStatus = 'Shortlisted';
        reason = `Passed ${interviewRound} interview, moving to next round`;
      }
    } else if (interviewResult === 'On Hold') {
      // Don't change application status for On Hold interviews
      return;
    }

    // Update application status if changed
    if (oldStatus !== newStatus) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          updatedBy: triggeredBy || null,
        },
      });

      // Log the status change
      await logStatusChange({
        entityType: 'Application',
        entityId: applicationId,
        oldStatus,
        newStatus,
        changedBy: triggeredBy || null,
        reason,
      });

      console.log(
        `Application ${applicationId} status updated: ${oldStatus} → ${newStatus}`
      );

      // Cascade to candidate status
      await updateCandidateStatusFromApplications(
        application.candidateId,
        application.organizationId,
        triggeredBy
      );
    }
  } catch (error) {
    console.error('Error updating application from interview:', error);
  }
}

/**
 * Updates application status when interview is scheduled
 * Called when a new interview is created
 */
export async function updateApplicationOnInterviewScheduled(
  applicationId: number,
  triggeredBy?: number
): Promise<void> {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      console.error('Application not found:', applicationId);
      return;
    }

    const oldStatus = application.status;
    const newStatus = 'Interview Scheduled';

    // Only update if not already in this status or further along
    if (
      oldStatus !== newStatus &&
      !['Selected', 'Rejected'].includes(oldStatus)
    ) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          updatedBy: triggeredBy || null,
        },
      });

      // Log the status change
      await logStatusChange({
        entityType: 'Application',
        entityId: applicationId,
        oldStatus,
        newStatus,
        changedBy: triggeredBy || null,
        reason: 'Interview scheduled',
      });

      console.log(
        `Application ${applicationId} status updated: ${oldStatus} → ${newStatus}`
      );

      // Cascade to candidate status
      await updateCandidateStatusFromApplications(
        application.candidateId,
        application.organizationId,
        triggeredBy
      );
    }
  } catch (error) {
    console.error('Error updating application on interview scheduled:', error);
  }
}

// ==================== Status Change Logging ====================

interface StatusChangeLogData {
  entityType: 'Candidate' | 'Application' | 'Interview';
  entityId: number;
  oldStatus: string;
  newStatus: string;
  changedBy: number | null;
  reason?: string;
}

/**
 * Logs a status change to the audit trail
 */
async function logStatusChange(data: StatusChangeLogData): Promise<void> {
  try {
    await prisma.statusChangeLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        changedBy: data.changedBy || 1, // Default to system user if null
        reason: data.reason || 'Status updated',
      },
    });
  } catch (error) {
    console.error('Error logging status change:', error);
  }
}

/**
 * Gets status change history for an entity
 */
export async function getStatusChangeHistory(
  entityType: 'Candidate' | 'Application' | 'Interview',
  entityId: number
): Promise<any[]> {
  try {
    return await prisma.statusChangeLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error getting status change history:', error);
    return [];
  }
}

// ==================== Manual Status Override ====================

/**
 * Manually update candidate status with audit trail
 * Use when user explicitly changes status in UI
 */
export async function updateCandidateStatusManually(
  candidateId: number,
  newStatus: string,
  userId: number,
  reason?: string
): Promise<void> {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const oldStatus = candidate.status;

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status: newStatus,
        updatedBy: userId,
      },
    });

    await logStatusChange({
      entityType: 'Candidate',
      entityId: candidateId,
      oldStatus,
      newStatus,
      changedBy: userId,
      reason: reason || 'Manually updated by user',
    });
  } catch (error) {
    console.error('Error manually updating candidate status:', error);
    throw error;
  }
}

/**
 * Manually update application status with audit trail
 */
export async function updateApplicationStatusManually(
  applicationId: number,
  newStatus: string,
  userId: number,
  reason?: string
): Promise<void> {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const oldStatus = application.status;

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        updatedBy: userId,
      },
    });

    await logStatusChange({
      entityType: 'Application',
      entityId: applicationId,
      oldStatus,
      newStatus,
      changedBy: userId,
      reason: reason || 'Manually updated by user',
    });

    // Cascade to candidate
    await updateCandidateStatusFromApplications(
      application.candidateId,
      application.organizationId,
      userId
    );
  } catch (error) {
    console.error('Error manually updating application status:', error);
    throw error;
  }
}
