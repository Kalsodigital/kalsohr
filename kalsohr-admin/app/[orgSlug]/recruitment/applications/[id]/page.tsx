'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  FileText,
  Clock,
  Edit,
  Trash2,
  Video,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
  Star,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApplicationById, deleteApplication, updateApplicationStatus } from '@/lib/api/org/recruitment';
import { Application, APPLICATION_STATUS } from '@/lib/types/recruitment';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
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

// Helper function to get full image URL
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};

// Helper component for info rows
interface InfoRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number | React.ReactNode;
}

function InfoRow({ icon, iconBg, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-4 group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors">
      <div className={`${iconBg} p-2.5 rounded-lg transition-colors`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">{label}</p>
        <div className="font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const applicationId = parseInt(params.id as string);

  const { hasPermission } = useOrgPermissions();
  const canUpdate = hasPermission('recruitment', 'canUpdate');
  const canDelete = hasPermission('recruitment', 'canDelete');

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const data = await getApplicationById(orgSlug, applicationId);
      setApplication(data);
    } catch (error: any) {
      console.error('Failed to load application:', error);
      toast.error(error?.message || 'Failed to load application details');
      router.push(`/${orgSlug}/recruitment/applications`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!application) return;

    try {
      setUpdatingStatus(true);
      await updateApplicationStatus(orgSlug, application.id, newStatus);
      toast.success('Application status updated successfully');
      loadApplication();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error?.message || 'Failed to update application status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!application) return;

    try {
      setDeleting(true);
      await deleteApplication(orgSlug, application.id);
      toast.success('Application deleted successfully');
      router.push(`/${orgSlug}/recruitment/applications`);
    } catch (error: any) {
      console.error('Failed to delete application:', error);
      toast.error(error?.message || 'Failed to delete application');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case APPLICATION_STATUS.APPLIED:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case APPLICATION_STATUS.SHORTLISTED:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case APPLICATION_STATUS.INTERVIEW_SCHEDULED:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case APPLICATION_STATUS.SELECTED:
        return 'bg-green-100 text-green-800 border-green-200';
      case APPLICATION_STATUS.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInterviewStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'Cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'Scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Rescheduled':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <p className="text-gray-600">Application not found</p>
        </div>
      </div>
    );
  }

  const candidate = application.candidate;
  const jobPosition = application.jobPosition;
  const interviews = application.interviewSchedules || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/${orgSlug}/recruitment/applications`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Applications
        </Button>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {candidate?.firstName} {candidate?.lastName}
          </h1>
          <p className="text-gray-600 mt-1">
            Applied for {jobPosition?.title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/${orgSlug}/recruitment/interviews?applicationId=${application.id}`)}
            disabled={!canUpdate}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
            title={canUpdate ? "Schedule Interview" : "No update permission"}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Interview
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!canDelete}
            title={canDelete ? "Delete Application" : "No delete permission"}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="p-6 bg-gradient-to-br from-white to-gray-50">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
            <AvatarImage src={getImageUrl(candidate?.profilePicture)} alt={candidate?.firstName || 'Candidate'} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {candidate?.firstName?.[0]}{candidate?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={`${getStatusBadgeColor(application.status)} border px-3 py-1`}>
                {application.status}
              </Badge>
              {jobPosition?.department && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{jobPosition.department.name}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="text-sm">{candidate?.email}</span>
              </div>
              {candidate?.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{candidate.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4 text-purple-600" />
                <div className="text-sm">
                  <span className="text-gray-500">Applied: </span>
                  {new Date(application.appliedDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="candidate">Candidate Details</TabsTrigger>
          <TabsTrigger value="interviews">
            Interview History
            {interviews.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                {interviews.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Application Details */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Application Details</h2>
              </div>
              <div className="space-y-4">
                <InfoRow
                  icon={<TrendingUp className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
                  label="Status"
                  value={
                    <Select
                      value={application.status}
                      onValueChange={handleStatusChange}
                      disabled={updatingStatus || !canUpdate}
                    >
                      <SelectTrigger className="w-full max-w-xs" title={canUpdate ? "Change Status" : "No update permission"}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={APPLICATION_STATUS.APPLIED}>Applied</SelectItem>
                        <SelectItem value={APPLICATION_STATUS.SHORTLISTED}>Shortlisted</SelectItem>
                        <SelectItem value={APPLICATION_STATUS.INTERVIEW_SCHEDULED}>
                          Interview Scheduled
                        </SelectItem>
                        <SelectItem value={APPLICATION_STATUS.SELECTED}>Selected</SelectItem>
                        <SelectItem value={APPLICATION_STATUS.REJECTED}>Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />
                <InfoRow
                  icon={<Calendar className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
                  label="Applied On"
                  value={new Date(application.appliedDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
                <InfoRow
                  icon={<Users className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-green-500 to-green-600"
                  label="Interviews"
                  value={`${interviews.length} interview${interviews.length !== 1 ? 's' : ''}`}
                />
              </div>
            </Card>

            {/* Job Position Details */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <Briefcase className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Job Position</h2>
              </div>
              <div className="space-y-4">
                <InfoRow
                  icon={<Briefcase className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
                  label="Title"
                  value={jobPosition?.title || '-'}
                />
                <InfoRow
                  icon={<FileText className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
                  label="Code"
                  value={jobPosition?.code || '-'}
                />
                <InfoRow
                  icon={<Building2 className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-green-500 to-green-600"
                  label="Department"
                  value={jobPosition?.department?.name || '-'}
                />
                <InfoRow
                  icon={<Users className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-orange-500 to-orange-600"
                  label="Vacancies"
                  value={jobPosition?.vacancies || 0}
                />
              </div>
            </Card>
          </div>

          {/* Notes Section */}
          {application.notes && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{application.notes}</p>
            </Card>
          )}
        </TabsContent>

        {/* Candidate Details Tab */}
        <TabsContent value="candidate" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Candidate Information</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/${orgSlug}/recruitment/candidates/${candidate?.id}`)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Full Profile
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoRow
                  icon={<User className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
                  label="Name"
                  value={`${candidate?.firstName} ${candidate?.lastName || ''}`}
                />
                <InfoRow
                  icon={<Mail className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
                  label="Email"
                  value={candidate?.email || '-'}
                />
                <InfoRow
                  icon={<Phone className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-green-500 to-green-600"
                  label="Phone"
                  value={candidate?.phone || '-'}
                />
              </div>

              <div className="space-y-4">
                <InfoRow
                  icon={<Building2 className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-orange-500 to-orange-600"
                  label="Current Company"
                  value={candidate?.currentCompany || '-'}
                />
                <InfoRow
                  icon={<Clock className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-teal-500 to-teal-600"
                  label="Experience"
                  value={candidate?.totalExperience ? `${candidate.totalExperience} years` : '-'}
                />
                <InfoRow
                  icon={<DollarSign className="w-5 h-5 text-white" />}
                  iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
                  label="Expected Salary"
                  value={
                    candidate?.expectedSalary ? (
                      <>
                        <span className="block">₹{Math.round(candidate.expectedSalary / 12).toLocaleString('en-IN')}/month</span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                          ₹{candidate.expectedSalary.toLocaleString('en-IN')}/year
                        </span>
                      </>
                    ) : '-'
                  }
                />
              </div>
            </div>

            {candidate?.skills && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.split(',').map((skill, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      {skill.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Interview History Tab */}
        <TabsContent value="interviews" className="space-y-6">
          {interviews.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">No interviews scheduled</p>
                <p className="text-sm">Schedule an interview to track the hiring process</p>
                <Button
                  className="mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => router.push(`/${orgSlug}/recruitment/interviews?applicationId=${application.id}`)}
                  disabled={!canUpdate}
                  title={canUpdate ? "Schedule Interview" : "No update permission"}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Interview
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview, index) => (
                <Card key={interview.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="font-semibold">
                          Round {index + 1}
                        </Badge>
                        <h3 className="text-lg font-semibold text-gray-900">{interview.roundName}</h3>
                        <div className="flex items-center gap-1.5">
                          {getInterviewStatusIcon(interview.status)}
                          <span className="text-sm font-medium text-gray-600">{interview.status}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          {new Date(interview.interviewDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-blue-600" />
                          {new Date(interview.interviewDate).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Video className="w-4 h-4 text-green-600" />
                          {interview.interviewMode}
                        </div>
                        {interview.interviewer && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4 text-orange-600" />
                            {interview.interviewer.firstName} {interview.interviewer.lastName}
                          </div>
                        )}
                      </div>

                      {interview.feedback && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Feedback</span>
                            {interview.rating && (
                              <div className="flex items-center gap-1 ml-auto">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm font-semibold">{interview.rating}/10</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{interview.feedback}</p>
                          {interview.result && (
                            <div className="mt-2">
                              <Badge
                                className={
                                  interview.result === 'Pass'
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : interview.result === 'Fail'
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                }
                              >
                                {interview.result}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      {interview.notes && !interview.feedback && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Notes</span>
                          </div>
                          <p className="text-sm text-blue-800 whitespace-pre-wrap">{interview.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this application? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
