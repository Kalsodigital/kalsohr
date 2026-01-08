import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';

/**
 * Get candidate comments with optional filtering by sectionKey
 * GET /api/:orgSlug/recruitment/candidates/:candidateId/comments
 */
export const getCandidateComments = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { candidateId } = req.params;
    const { sectionKey } = req.query;

    // Verify candidate belongs to organization
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: parseInt(candidateId),
        organizationId,
      },
    });

    if (!candidate) {
      return sendError(res, 'Candidate not found', STATUS_CODES.NOT_FOUND);
    }

    // Build where clause
    const where: any = {
      candidateId: parseInt(candidateId),
      parentCommentId: null, // Only get top-level comments
    };

    if (sectionKey) {
      where.sectionKey = sectionKey as string;
    }

    // Get all top-level comments with replies and user info
    const comments = await prisma.candidateComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Calculate comment counts by section key (for badge display)
    const allComments = await prisma.candidateComment.findMany({
      where: {
        candidateId: parseInt(candidateId),
        parentCommentId: null,
      },
      select: {
        sectionKey: true,
        createdAt: true,
      },
    });

    const bySectionKey: Record<string, number> = {};
    allComments.forEach((comment) => {
      bySectionKey[comment.sectionKey] = (bySectionKey[comment.sectionKey] || 0) + 1;
    });

    // Calculate unread counts per section
    const unreadCounts: Record<string, number> = {};

    if (userId) {
      // Get all comment views for this user and candidate
      const commentViews = await prisma.commentView.findMany({
        where: {
          userId,
          candidateId: parseInt(candidateId),
        },
      });

      // Create a map of sectionKey -> lastViewedAt
      const viewMap: Record<string, Date> = {};
      commentViews.forEach((view) => {
        viewMap[view.sectionKey] = view.lastViewedAt;
      });

      // Count unread comments per section
      allComments.forEach((comment) => {
        const lastViewed = viewMap[comment.sectionKey];

        // If never viewed, or comment created after last view, it's unread
        if (!lastViewed || comment.createdAt > lastViewed) {
          unreadCounts[comment.sectionKey] = (unreadCounts[comment.sectionKey] || 0) + 1;
        }
      });
    }

    return sendSuccess(res, {
      comments,
      stats: {
        bySectionKey,
        unreadCounts,
      },
    }, 'Comments retrieved successfully');
  } catch (error) {
    console.error('Get candidate comments error:', error);
    return sendError(res, MESSAGES.INTERNAL_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Create a new comment or reply
 * POST /api/:orgSlug/recruitment/candidates/:candidateId/comments
 */
export const createCandidateComment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { candidateId } = req.params;
    const { sectionKey, comment, rating, parentCommentId } = req.body;

    // Verify candidate belongs to organization
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: parseInt(candidateId),
        organizationId,
      },
    });

    if (!candidate) {
      return sendError(res, 'Candidate not found', STATUS_CODES.NOT_FOUND);
    }

    // Validate required fields
    if (!comment || comment.trim().length === 0) {
      return sendError(res, 'Comment text is required', STATUS_CODES.BAD_REQUEST);
    }

    if (comment.length > 5000) {
      return sendError(res, 'Comment must be less than 5000 characters', STATUS_CODES.BAD_REQUEST);
    }

    // If this is a top-level comment, sectionKey is required
    if (!parentCommentId && !sectionKey) {
      return sendError(res, 'Section key is required for top-level comments', STATUS_CODES.BAD_REQUEST);
    }

    // Validate rating (if provided)
    if (rating !== undefined && rating !== null) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return sendError(res, 'Rating must be a number between 1 and 5', STATUS_CODES.BAD_REQUEST);
      }

      // Ratings are only allowed on top-level comments, not replies
      if (parentCommentId) {
        return sendError(res, 'Ratings are not allowed on replies', STATUS_CODES.BAD_REQUEST);
      }
    }

    // If parentCommentId is provided, verify it exists and is a top-level comment
    let parentCommentSectionKey = sectionKey;
    if (parentCommentId) {
      const parentComment = await prisma.candidateComment.findFirst({
        where: {
          id: parseInt(parentCommentId),
          candidateId: parseInt(candidateId),
        },
      });

      if (!parentComment) {
        return sendError(res, 'Parent comment not found', STATUS_CODES.NOT_FOUND);
      }

      // Ensure single-level threading: parent cannot itself be a reply
      if (parentComment.parentCommentId) {
        return sendError(res, 'Cannot reply to a reply. Only single-level threading is supported.', STATUS_CODES.BAD_REQUEST);
      }

      // Replies inherit the parent's sectionKey
      parentCommentSectionKey = parentComment.sectionKey;
    }

    // Create the comment
    const newComment = await prisma.candidateComment.create({
      data: {
        organizationId,
        candidateId: parseInt(candidateId),
        userId,
        sectionKey: parentCommentSectionKey, // Replies inherit parent's sectionKey
        comment: comment.trim(),
        rating: rating || null,
        parentCommentId: parentCommentId ? parseInt(parentCommentId) : null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return sendSuccess(res, newComment, 'Comment created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create candidate comment error:', error);
    return sendError(res, MESSAGES.INTERNAL_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Update a comment (only by the author)
 * PUT /api/:orgSlug/recruitment/candidates/:candidateId/comments/:commentId
 */
export const updateCandidateComment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { candidateId, commentId } = req.params;
    const { comment, rating } = req.body;

    // Find the comment
    const existingComment = await prisma.candidateComment.findFirst({
      where: {
        id: parseInt(commentId),
        candidateId: parseInt(candidateId),
        organizationId,
      },
    });

    if (!existingComment) {
      return sendError(res, 'Comment not found', STATUS_CODES.NOT_FOUND);
    }

    // Verify ownership
    if (existingComment.userId !== userId) {
      return sendError(res, 'You can only edit your own comments', STATUS_CODES.FORBIDDEN);
    }

    // Validate comment text if provided
    if (comment !== undefined) {
      if (!comment || comment.trim().length === 0) {
        return sendError(res, 'Comment text cannot be empty', STATUS_CODES.BAD_REQUEST);
      }

      if (comment.length > 5000) {
        return sendError(res, 'Comment must be less than 5000 characters', STATUS_CODES.BAD_REQUEST);
      }
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return sendError(res, 'Rating must be a number between 1 and 5', STATUS_CODES.BAD_REQUEST);
      }

      // Ratings only allowed on top-level comments
      if (existingComment.parentCommentId) {
        return sendError(res, 'Ratings are not allowed on replies', STATUS_CODES.BAD_REQUEST);
      }
    }

    // Build update data
    const updateData: any = {
      updatedBy: userId,
    };

    if (comment !== undefined) {
      updateData.comment = comment.trim();
    }

    if (rating !== undefined) {
      updateData.rating = rating;
    }

    // Update the comment
    const updatedComment = await prisma.candidateComment.update({
      where: { id: parseInt(commentId) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return sendSuccess(res, updatedComment, 'Comment updated successfully');
  } catch (error) {
    console.error('Update candidate comment error:', error);
    return sendError(res, MESSAGES.INTERNAL_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Delete a comment (only by the author)
 * DELETE /api/:orgSlug/recruitment/candidates/:candidateId/comments/:commentId
 */
export const deleteCandidateComment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { candidateId, commentId } = req.params;

    // Find the comment
    const existingComment = await prisma.candidateComment.findFirst({
      where: {
        id: parseInt(commentId),
        candidateId: parseInt(candidateId),
        organizationId,
      },
    });

    if (!existingComment) {
      return sendError(res, 'Comment not found', STATUS_CODES.NOT_FOUND);
    }

    // Verify ownership
    if (existingComment.userId !== userId) {
      return sendError(res, 'You can only delete your own comments', STATUS_CODES.FORBIDDEN);
    }

    // Delete the comment (cascade will delete replies if any)
    await prisma.candidateComment.delete({
      where: { id: parseInt(commentId) },
    });

    return sendSuccess(res, null, 'Comment deleted successfully');
  } catch (error) {
    console.error('Delete candidate comment error:', error);
    return sendError(res, MESSAGES.INTERNAL_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Mark comments as viewed for a specific section
 * POST /api/:orgSlug/recruitment/candidates/:candidateId/comments/mark-viewed
 */
export const markCommentsAsViewed = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { candidateId } = req.params;
    const { sectionKey } = req.body;

    if (!userId) {
      return sendError(res, 'User ID is required', STATUS_CODES.UNAUTHORIZED);
    }

    // Verify candidate belongs to organization
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: parseInt(candidateId),
        organizationId,
      },
    });

    if (!candidate) {
      return sendError(res, 'Candidate not found', STATUS_CODES.NOT_FOUND);
    }

    if (!sectionKey) {
      return sendError(res, 'Section key is required', STATUS_CODES.BAD_REQUEST);
    }

    // Upsert the comment view record
    await prisma.commentView.upsert({
      where: {
        userId_candidateId_sectionKey: {
          userId,
          candidateId: parseInt(candidateId),
          sectionKey,
        },
      },
      update: {
        lastViewedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        candidateId: parseInt(candidateId),
        sectionKey,
        lastViewedAt: new Date(),
      },
    });

    return sendSuccess(res, { sectionKey, markedAt: new Date() }, 'Comments marked as viewed');
  } catch (error) {
    console.error('Mark comments as viewed error:', error);
    return sendError(res, MESSAGES.INTERNAL_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get recent comments for dashboard widget
 * GET /api/:orgSlug/recruitment/dashboard/recent-comments
 */
export const getRecentComments = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { limit = '10' } = req.query;

    if (!userId) {
      return sendError(res, 'User ID is required', STATUS_CODES.UNAUTHORIZED);
    }

    // Get recent comments (both top-level AND replies) from the last 7 days
    // Exclude comments posted by the current user (show only comments from others)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentComments = await prisma.candidateComment.findMany({
      where: {
        organizationId,
        // Removed parentCommentId filter - now includes both top-level and replies
        userId: {
          not: userId, // Exclude current user's own comments
        },
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parentComment: {
          select: {
            id: true,
            comment: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Get user's comment views to determine unread status
    const candidateIds = [...new Set(recentComments.map((c) => c.candidateId))];
    const commentViews = await prisma.commentView.findMany({
      where: {
        userId,
        candidateId: {
          in: candidateIds,
        },
      },
    });

    // Create a map of (candidateId, sectionKey) -> lastViewedAt
    const viewMap: Record<string, Date> = {};
    commentViews.forEach((view) => {
      viewMap[`${view.candidateId}_${view.sectionKey}`] = view.lastViewedAt;
    });

    // Enhance comments with unread status
    const enhancedComments = recentComments.map((comment) => {
      const viewKey = `${comment.candidateId}_${comment.sectionKey}`;
      const lastViewed = viewMap[viewKey];
      const isUnread = !lastViewed || comment.createdAt > lastViewed;

      return {
        ...comment,
        isUnread,
      };
    });

    return sendSuccess(res, enhancedComments, 'Recent comments retrieved successfully');
  } catch (error) {
    console.error('Get recent comments error:', error);
    return sendError(res, MESSAGES.INTERNAL_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};
