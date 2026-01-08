'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  User,
  Mail,
  Briefcase,
  Building2,
  Star,
  FileText,
  CheckCircle2,
  XCircle,
  Pause,
  MessageSquare,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getInterviewScheduleById,
  submitFeedback,
  updateInterviewSchedule,
} from '@/lib/api/org/recruitment';
import { InterviewSchedule, INTERVIEW_STATUS, INTERVIEW_MODE } from '@/lib/types/recruitment';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { formatDistanceToNow } from 'date-fns';

// Helper function to get full image URL
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};

interface FeedbackForm {
  feedback: string;
  rating: number;
  result: 'Pass' | 'Fail' | 'On Hold';
  notes: string;
}

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const interviewId = parseInt(params.id as string);

  const { hasPermission, isLoading: permissionLoading } = useOrgPermissions();

  // Permission checks
  const canRead = hasPermission('recruitment', 'canRead');
  const canUpdate = hasPermission('recruitment', 'canUpdate');
  const canDelete = hasPermission('recruitment', 'canDelete');

  // State
  const [interview, setInterview] = useState<InterviewSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    feedback: '',
    rating: 5,
    result: 'Pass',
    notes: '',
  });

  // Load interview details
  useEffect(() => {
    const loadInterview = async () => {
      if (!canRead) return;

      try {
        setLoading(true);
        const data = await getInterviewScheduleById(orgSlug, interviewId);
        setInterview(data);

        // Pre-fill feedback form if feedback exists
        if (data.feedback || data.rating || data.result) {
          setFeedbackForm({
            feedback: data.feedback || '',
            rating: data.rating || 5,
            result: data.result || 'Pass',
            notes: data.notes || '',
          });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load interview details');
        router.push(`/${orgSlug}/recruitment/interviews`);
      } finally {
        setLoading(false);
      }
    };

    if (!permissionLoading && canRead) {
      loadInterview();
    }
  }, [interviewId, orgSlug, permissionLoading, canRead, router]);

  // Don't render until permission check is complete
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">You don't have permission to view interview details.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading interview details...</p>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Interview not found</p>
      </div>
    );
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.feedback.trim()) {
      toast.error('Please provide feedback');
      return;
    }

    try {
      setSubmitting(true);
      await submitFeedback(orgSlug, interviewId, {
        feedback: feedbackForm.feedback,
        rating: feedbackForm.rating,
        result: feedbackForm.result,
        notes: feedbackForm.notes || undefined,
      });

      toast.success('Feedback submitted successfully');
      setFeedbackDialogOpen(false);

      // Reload interview data
      const updatedInterview = await getInterviewScheduleById(orgSlug, interviewId);
      setInterview(updatedInterview);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInterview = async () => {
    try {
      setSubmitting(true);
      await updateInterviewSchedule(orgSlug, interviewId, {
        status: INTERVIEW_STATUS.CANCELLED,
      });

      toast.success('Interview cancelled successfully');
      setCancelDialogOpen(false);

      // Reload interview data
      const updatedInterview = await getInterviewScheduleById(orgSlug, interviewId);
      setInterview(updatedInterview);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel interview');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case INTERVIEW_STATUS.SCHEDULED:
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            Scheduled
          </Badge>
        );
      case INTERVIEW_STATUS.COMPLETED:
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case INTERVIEW_STATUS.CANCELLED:
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      case INTERVIEW_STATUS.RESCHEDULED:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Pause className="w-3 h-3 mr-1" />
            Rescheduled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return null;

    switch (result) {
      case 'Pass':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Passed
          </Badge>
        );
      case 'Fail':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'On Hold':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Pause className="w-3 h-3 mr-1" />
            On Hold
          </Badge>
        );
      default:
        return null;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case INTERVIEW_MODE.VIDEO:
        return <Video className="w-5 h-5 text-blue-600" />;
      case INTERVIEW_MODE.PHONE:
        return <Phone className="w-5 h-5 text-green-600" />;
      case INTERVIEW_MODE.IN_PERSON:
        return <MapPin className="w-5 h-5 text-purple-600" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDateTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const candidate = interview.application?.candidate;
  const jobPosition = interview.application?.jobPosition;
  const { date, time } = formatDateTime(interview.interviewDate);

  const canSubmitFeedback =
    canUpdate &&
    interview.status === INTERVIEW_STATUS.SCHEDULED &&
    new Date(interview.interviewDate) < new Date(); // Interview has passed

  const canCancelInterview =
    canUpdate &&
    interview.status === INTERVIEW_STATUS.SCHEDULED &&
    new Date(interview.interviewDate) > new Date(); // Interview is in future

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${orgSlug}/recruitment/interviews`)}
            className="mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {interview.roundName} Interview
              </h1>
              {getStatusBadge(interview.status)}
              {interview.result && getResultBadge(interview.result)}
            </div>
            <p className="text-gray-600">
              {candidate?.firstName} {candidate?.lastName} • {jobPosition?.title}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {canSubmitFeedback && (
            <Button
              onClick={() => setFeedbackDialogOpen(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Submit Feedback
            </Button>
          )}
          {canCancelInterview && (
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Interview
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Candidate Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={getImageUrl(candidate?.profilePicture)}
                    alt={candidate?.firstName}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xl">
                    {candidate?.firstName?.[0]}
                    {candidate?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {candidate?.firstName} {candidate?.lastName}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      {candidate?.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {candidate.email}
                        </div>
                      )}
                      {candidate?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {candidate.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    {candidate?.currentCompany && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current Company</p>
                        <p className="text-sm font-medium text-gray-900">
                          {candidate.currentCompany}
                        </p>
                      </div>
                    )}
                    {candidate?.totalExperience !== null && candidate?.totalExperience !== undefined && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Experience</p>
                        <p className="text-sm font-medium text-gray-900">
                          {candidate.totalExperience} {candidate.totalExperience === 1 ? 'year' : 'years'}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/${orgSlug}/recruitment/candidates/${candidate?.id}`)
                    }
                    className="mt-3"
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    View Full Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Position & Application */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                Job Position & Application
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Position</p>
                  <p className="text-lg font-semibold text-gray-900">{jobPosition?.title}</p>
                </div>

                {jobPosition?.department && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Department</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-600" />
                      <p className="text-sm font-medium text-gray-900">
                        {jobPosition.department.name}
                      </p>
                    </div>
                  </div>
                )}

                {interview.application && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Application Status</p>
                    <Badge variant="outline">{interview.application.status}</Badge>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/${orgSlug}/recruitment/applications?candidateId=${candidate?.id}`)
                  }
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  View Application Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Section */}
          {interview.status === INTERVIEW_STATUS.COMPLETED && interview.feedback && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  Interview Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {interview.rating && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Rating</p>
                    <div className="flex items-center gap-2">
                      {[...Array(10)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < interview.rating!
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-lg font-semibold text-gray-900 ml-2">
                        {interview.rating}/10
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500 mb-2">Feedback</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{interview.feedback}</p>
                </div>

                {interview.notes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Additional Notes</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{interview.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Interview Details */}
        <div className="space-y-6">
          {/* Interview Schedule */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Interview Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="text-sm font-medium text-gray-900">{date}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Time</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-medium text-gray-900">{time}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Round</p>
                <Badge variant="outline">{interview.roundName}</Badge>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Interview Mode</p>
                <div className="flex items-center gap-2">
                  {getModeIcon(interview.interviewMode)}
                  <p className="text-sm font-medium text-gray-900">{interview.interviewMode}</p>
                </div>
              </div>

              {interview.interviewMode === INTERVIEW_MODE.VIDEO && interview.meetingLink && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Meeting Link</p>
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Join Meeting
                  </a>
                </div>
              )}

              {interview.interviewMode === INTERVIEW_MODE.IN_PERSON && interview.location && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-600 mt-0.5" />
                    <p className="text-sm text-gray-900">{interview.location}</p>
                  </div>
                </div>
              )}

              {interview.interviewer && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Interviewer</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {interview.interviewer.firstName} {interview.interviewer.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{interview.interviewer.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Information */}
          {(interview.createdAt || interview.updatedAt) && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Record Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {interview.createdAt && (
                  <div>
                    <p className="text-gray-500 mb-1">Created</p>
                    <p className="text-gray-900">
                      {formatDistanceToNow(new Date(interview.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                )}
                {interview.updatedAt && (
                  <div>
                    <p className="text-gray-500 mb-1">Last Updated</p>
                    <p className="text-gray-900">
                      {formatDistanceToNow(new Date(interview.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Feedback Submission Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Submit Interview Feedback</DialogTitle>
            <DialogDescription>
              Provide feedback for {candidate?.firstName} {candidate?.lastName}'s{' '}
              {interview.roundName} interview
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Rating */}
            <div>
              <Label htmlFor="rating" className="text-sm font-medium text-gray-700 mb-2 block">
                Rating (1-10) <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-4">
                <Select
                  value={String(feedbackForm.rating)}
                  onValueChange={value =>
                    setFeedbackForm({ ...feedbackForm, rating: parseInt(value) })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(10)].map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  {[...Array(10)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < feedbackForm.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Result */}
            <div>
              <Label htmlFor="result" className="text-sm font-medium text-gray-700 mb-2 block">
                Result <span className="text-red-500">*</span>
              </Label>
              <Select
                value={feedbackForm.result}
                onValueChange={value =>
                  setFeedbackForm({ ...feedbackForm, result: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass - Move to next round</SelectItem>
                  <SelectItem value="Fail">Fail - Reject candidate</SelectItem>
                  <SelectItem value="On Hold">On Hold - Need more evaluation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feedback */}
            <div>
              <Label htmlFor="feedback" className="text-sm font-medium text-gray-700 mb-2 block">
                Feedback <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="feedback"
                value={feedbackForm.feedback}
                onChange={e => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                placeholder="Provide detailed feedback about the candidate's performance..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {feedbackForm.feedback.length}/5000 characters
              </p>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-2 block">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={feedbackForm.notes}
                onChange={e => setFeedbackForm({ ...feedbackForm, notes: e.target.value })}
                placeholder="Any additional notes or observations..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeedbackDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={submitting || !feedbackForm.feedback.trim()}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Interview Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Interview</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this interview? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={submitting}>
              No, Keep It
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelInterview}
              disabled={submitting}
            >
              {submitting ? 'Cancelling...' : 'Yes, Cancel Interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
