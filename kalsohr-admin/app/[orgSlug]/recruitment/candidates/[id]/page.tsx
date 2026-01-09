'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getCandidateById, deleteCandidate, getCandidateComments } from '@/lib/api/org/recruitment';
import { Candidate, CANDIDATE_STATUS, SECTION_KEYS } from '@/lib/types/recruitment';
import { EditCandidateDialog } from '../edit-candidate-dialog';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { SectionCommentsIcon } from './components/section-comments-icon';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Users,
  FileText,
  Activity,
  Edit,
  Trash2,
  Download,
  Loader2,
  IndianRupee,
  Clock,
  GraduationCap,
  BookOpen,
  User,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';

// Helper function to get full image URL
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const candidateId = parseInt(params.id as string);

  const { hasPermission, isLoading: permissionLoading } = useOrgPermissions();

  // Permission checks
  const canRead = hasPermission('recruitment', 'canRead');
  const canUpdate = hasPermission('recruitment', 'canUpdate');
  const canDelete = hasPermission('recruitment', 'canDelete');

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadCandidate();
  }, [candidateId]);

  useEffect(() => {
    if (candidate) {
      loadCommentCounts();
    }
  }, [candidate]);

  const loadCandidate = async () => {
    try {
      setLoading(true);
      const data = await getCandidateById(orgSlug, candidateId);
      setCandidate(data);
    } catch (error) {
      console.error('Failed to load candidate:', error);
      toast.error('Failed to load candidate details');
      router.push(`/${orgSlug}/recruitment/candidates`);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentCounts = async () => {
    try {
      const response = await getCandidateComments(orgSlug, candidateId);
      if (response?.stats?.bySectionKey) {
        setCommentCounts(response.stats.bySectionKey);
      }
      if (response?.stats?.unreadCounts) {
        setUnreadCounts(response.stats.unreadCounts);
      } else {
        setUnreadCounts({});
      }
    } catch (error) {
      console.error('Failed to load comment counts:', error);
      // Silently fail - comments are not critical
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case CANDIDATE_STATUS.NEW:
        return 'bg-blue-100 text-blue-800';
      case CANDIDATE_STATUS.IN_PROCESS:
        return 'bg-yellow-100 text-yellow-800';
      case CANDIDATE_STATUS.SELECTED:
        return 'bg-green-100 text-green-800';
      case CANDIDATE_STATUS.REJECTED:
        return 'bg-red-100 text-red-800';
      case CANDIDATE_STATUS.ON_HOLD:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy');
  };

  const getInitials = () => {
    if (!candidate) return 'C';
    return `${candidate.firstName?.[0] || ''}${candidate.lastName?.[0] || ''}`.toUpperCase() || 'C';
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!candidate) return;

    try {
      setIsDeleting(true);
      await deleteCandidate(orgSlug, candidate.id);
      toast.success('Candidate deleted successfully');
      setIsDeleteDialogOpen(false);
      router.push(`/${orgSlug}/recruitment/candidates`);
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete candidate');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadResume = () => {
    if ((candidate as any)?.resumePath) {
      const resumeUrl = getImageUrl((candidate as any).resumePath);
      window.open(resumeUrl, '_blank');
    }
  };

  // Don't render until permission check is complete
  if (permissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">You don't have permission to view candidates.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading candidate details...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/${orgSlug}/recruitment/candidates`)}
          className="hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Candidates
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {candidate.firstName} {candidate.lastName}
            </h1>
            <p className="text-gray-600 mt-2">
              {candidate.currentCompany || 'No current company'}
            </p>
          </div>
          <div className="flex gap-2">
            {(candidate as any).resumePath && (
              <Button
                onClick={handleDownloadResume}
                variant="outline"
                className="border-green-200 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Resume
              </Button>
            )}
            <Button
              onClick={() => setIsEditDialogOpen(true)}
              disabled={!canUpdate}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={canUpdate ? "Edit Candidate" : "No edit permission"}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={!canDelete}
              variant="destructive"
              className="disabled:opacity-50 disabled:cursor-not-allowed"
              title={canDelete ? "Delete Candidate" : "No delete permission"}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-start gap-8">
            <div className="relative">
              <Avatar
                className="h-32 w-32 border-4 border-white shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => candidate.profilePicture && setIsImageModalOpen(true)}
              >
                <AvatarImage src={getImageUrl(candidate.profilePicture)} alt={candidate.firstName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white text-3xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-4 mb-5">
                <Badge className={`${getStatusColor(candidate.status)} px-3 py-1 text-sm font-semibold`}>
                  {candidate.status}
                </Badge>
                {candidate.source && (
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{candidate.source}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-6 mt-6">
                {candidate.email && (
                  <div className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium">{candidate.email}</span>
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors">
                    <div className="bg-green-50 p-2 rounded-lg">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-medium">{candidate.phone}</span>
                  </div>
                )}
                {candidate.createdAt && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="bg-purple-50 p-2 rounded-lg">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">Applied</span>
                      <span className="font-medium">{formatDate(candidate.createdAt as any)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="family">Family</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Quick Info Card */}
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4 relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      </div>
                      Quick Information
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.QUICK_INFO}
                        sectionLabel="Quick Information"
                        commentCount={commentCounts[SECTION_KEYS.QUICK_INFO] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.QUICK_INFO] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <InfoRow
                      icon={<Building2 className="w-5 h-5 text-purple-600" />}
                      iconBg="bg-purple-50 group-hover:bg-purple-100"
                      label="Current Company"
                      value={candidate.currentCompany || '-'}
                    />
                    <InfoRow
                      icon={<Briefcase className="w-5 h-5 text-blue-600" />}
                      iconBg="bg-blue-50 group-hover:bg-blue-100"
                      label="Total Experience"
                      value={candidate.totalExperience !== null ? `${candidate.totalExperience} years` : '-'}
                    />
                    <InfoRow
                      icon={<IndianRupee className="w-5 h-5 text-green-600" />}
                      iconBg="bg-green-50 group-hover:bg-green-100"
                      label="Expected Salary"
                      value={
                        candidate.expectedSalary ? (
                          <>
                            <span className="block">₹{Math.round(candidate.expectedSalary / 12).toLocaleString('en-IN')}/month</span>
                            <span className="block text-xs text-gray-500 mt-0.5">
                              ₹{Number(candidate.expectedSalary).toLocaleString('en-IN')}/year
                            </span>
                          </>
                        ) : '-'
                      }
                    />
                    <InfoRow
                      icon={<Activity className="w-5 h-5 text-orange-600" />}
                      iconBg="bg-orange-50 group-hover:bg-orange-100"
                      label="Source"
                      value={candidate.source || '-'}
                    />
                  </CardContent>
                </Card>

                {/* Contact Information Card */}
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4 relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Phone className="w-5 h-5 text-green-600" />
                      </div>
                      Contact Information
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.CONTACT_INFO}
                        sectionLabel="Contact Information"
                        commentCount={commentCounts[SECTION_KEYS.CONTACT_INFO] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.CONTACT_INFO] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <InfoRow
                      icon={<Mail className="w-5 h-5 text-blue-600" />}
                      iconBg="bg-blue-50 group-hover:bg-blue-100"
                      label="Email"
                      value={candidate.email || '-'}
                    />
                    <InfoRow
                      icon={<Phone className="w-5 h-5 text-green-600" />}
                      iconBg="bg-green-50 group-hover:bg-green-100"
                      label="Phone"
                      value={candidate.phone || '-'}
                    />
                    {candidate.alternatePhone && (
                      <InfoRow
                        icon={<Phone className="w-5 h-5 text-green-600" />}
                        iconBg="bg-green-50 group-hover:bg-green-100"
                        label="Alternate Phone"
                        value={candidate.alternatePhone}
                      />
                    )}
                    <InfoRow
                      icon={<MapPin className="w-5 h-5 text-red-600" />}
                      iconBg="bg-red-50 group-hover:bg-red-100"
                      label="City"
                      value={(candidate as any).cityMaster ? `${(candidate as any).cityMaster.name}, ${(candidate as any).cityMaster.state?.name}` : '-'}
                    />
                  </CardContent>
                </Card>

                {/* Application Details Card */}
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4 relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-purple-600" />
                      </div>
                      Application Details
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.APPLICATION_DETAILS}
                        sectionLabel="Application Details"
                        commentCount={commentCounts[SECTION_KEYS.APPLICATION_DETAILS] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.APPLICATION_DETAILS] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <InfoRow
                      icon={<Activity className="w-5 h-5 text-blue-600" />}
                      iconBg="bg-blue-50 group-hover:bg-blue-100"
                      label="Status"
                      value={candidate.status}
                    />
                    <InfoRow
                      icon={<Calendar className="w-5 h-5 text-purple-600" />}
                      iconBg="bg-purple-50 group-hover:bg-purple-100"
                      label="Applied On"
                      value={formatDate(candidate.createdAt as any)}
                    />
                    {candidate.referredBy && (
                      <InfoRow
                        icon={<Users className="w-5 h-5 text-orange-600" />}
                        iconBg="bg-orange-50 group-hover:bg-orange-100"
                        label="Referred By"
                        value={candidate.referredBy}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Notes Section */}
              {candidate.notes && (
                <Card className="border-0 shadow-md">
                  <CardHeader className="relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      Notes
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.NOTES}
                        sectionLabel="Notes"
                        commentCount={commentCounts[SECTION_KEYS.NOTES] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.NOTES] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{candidate.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Professional Tab */}
            <TabsContent value="professional" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Professional Information */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                      Professional Information
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.PROFESSIONAL_INFO}
                        sectionLabel="Professional Information"
                        commentCount={commentCounts[SECTION_KEYS.PROFESSIONAL_INFO] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.PROFESSIONAL_INFO] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <InfoRow
                      icon={<Building2 className="w-5 h-5 text-purple-600" />}
                      iconBg="bg-purple-50"
                      label="Current Company"
                      value={candidate.currentCompany || '-'}
                    />
                    <InfoRow
                      icon={<Briefcase className="w-5 h-5 text-blue-600" />}
                      iconBg="bg-blue-50"
                      label="Total Experience"
                      value={candidate.totalExperience !== null ? `${candidate.totalExperience} years` : '-'}
                    />
                    <InfoRow
                      icon={<IndianRupee className="w-5 h-5 text-green-600" />}
                      iconBg="bg-green-50"
                      label="Current Salary"
                      value={
                        candidate.currentSalary ? (
                          <>
                            <span className="block">₹{Math.round(candidate.currentSalary / 12).toLocaleString('en-IN')}/month</span>
                            <span className="block text-xs text-gray-500 mt-0.5">
                              ₹{Number(candidate.currentSalary).toLocaleString('en-IN')}/year
                            </span>
                          </>
                        ) : '-'
                      }
                    />
                    <InfoRow
                      icon={<IndianRupee className="w-5 h-5 text-green-600" />}
                      iconBg="bg-green-50"
                      label="Expected Salary"
                      value={
                        candidate.expectedSalary ? (
                          <>
                            <span className="block">₹{Math.round(candidate.expectedSalary / 12).toLocaleString('en-IN')}/month</span>
                            <span className="block text-xs text-gray-500 mt-0.5">
                              ₹{Number(candidate.expectedSalary).toLocaleString('en-IN')}/year
                            </span>
                          </>
                        ) : '-'
                      }
                    />
                    <InfoRow
                      icon={<Clock className="w-5 h-5 text-orange-600" />}
                      iconBg="bg-orange-50"
                      label="Notice Period"
                      value={candidate.noticePeriod !== null ? `${candidate.noticePeriod} days` : '-'}
                    />
                  </CardContent>
                </Card>

                {/* Education */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      Education
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.EDUCATION}
                        sectionLabel="Education"
                        commentCount={commentCounts[SECTION_KEYS.EDUCATION] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.EDUCATION] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <InfoRow
                      icon={<BookOpen className="w-5 h-5 text-blue-600" />}
                      iconBg="bg-blue-50"
                      label="Education Level"
                      value={(candidate as any).educationLevelMaster?.name || candidate.educationLevel || '-'}
                    />
                    {candidate.qualifications && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Qualifications</p>
                        <p className="text-gray-900">{candidate.qualifications}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Skills */}
              {candidate.skills && (
                <Card className="border-0 shadow-md">
                  <CardHeader className="relative">
                    <CardTitle className="text-lg font-bold">Skills</CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.SKILLS}
                        sectionLabel="Skills"
                        commentCount={commentCounts[SECTION_KEYS.SKILLS] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.SKILLS] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.split(',').map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Personal Tab */}
            <TabsContent value="personal" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Personal Information
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.PERSONAL_INFO}
                        sectionLabel="Personal Information"
                        commentCount={commentCounts[SECTION_KEYS.PERSONAL_INFO] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.PERSONAL_INFO] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <InfoRow
                      icon={<Calendar className="w-5 h-5 text-purple-600" />}
                      iconBg="bg-purple-50"
                      label="Date of Birth"
                      value={formatDate(candidate.dateOfBirth as any)}
                    />
                    <InfoRow
                      icon={<User className="w-5 h-5 text-blue-600" />}
                      iconBg="bg-blue-50"
                      label="Gender"
                      value={(candidate as any).genderMaster?.name || '-'}
                    />
                    <InfoRow
                      icon={<Users className="w-5 h-5 text-green-600" />}
                      iconBg="bg-green-50"
                      label="Marital Status"
                      value={(candidate as any).maritalStatusMaster?.name || '-'}
                    />
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-red-600" />
                      Address Information
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.ADDRESS_INFO}
                        sectionLabel="Address Information"
                        commentCount={commentCounts[SECTION_KEYS.ADDRESS_INFO] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.ADDRESS_INFO] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {candidate.currentAddress && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Current Address</p>
                        <p className="text-gray-900">{candidate.currentAddress}</p>
                      </div>
                    )}
                    {candidate.permanentAddress && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Permanent Address</p>
                        <p className="text-gray-900">{candidate.permanentAddress}</p>
                      </div>
                    )}
                    {(candidate as any).cityMaster && (
                      <InfoRow
                        icon={<MapPin className="w-5 h-5 text-red-600" />}
                        iconBg="bg-red-50"
                        label="City"
                        value={`${(candidate as any).cityMaster.name}, ${(candidate as any).cityMaster.state?.name}, ${(candidate as any).cityMaster.state?.country?.name}`}
                      />
                    )}
                    {candidate.postalCode && (
                      <InfoRow
                        icon={<MapPin className="w-5 h-5 text-red-600" />}
                        iconBg="bg-red-50"
                        label="Postal Code"
                        value={candidate.postalCode}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Family Tab */}
            <TabsContent value="family" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Father's Information */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Father's Information
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.FATHER_INFO}
                        sectionLabel="Father's Information"
                        commentCount={commentCounts[SECTION_KEYS.FATHER_INFO] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.FATHER_INFO] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {candidate.fatherStatus && (
                      <InfoRow
                        icon={<Info className="w-5 h-5 text-gray-600" />}
                        iconBg="bg-gray-50"
                        label="Status"
                        value={candidate.fatherStatus}
                      />
                    )}
                    {candidate.fatherStatus === 'Alive' && (
                      <>
                        {candidate.fatherName && (
                          <InfoRow
                            icon={<User className="w-5 h-5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            label="Name"
                            value={candidate.fatherName}
                          />
                        )}
                        {candidate.fatherOccupation && (
                          <InfoRow
                            icon={<Briefcase className="w-5 h-5 text-purple-600" />}
                            iconBg="bg-purple-50"
                            label="Occupation"
                            value={candidate.fatherOccupation}
                          />
                        )}
                        {candidate.fatherContact && (
                          <InfoRow
                            icon={<Phone className="w-5 h-5 text-green-600" />}
                            iconBg="bg-green-50"
                            label="Contact"
                            value={candidate.fatherContact}
                          />
                        )}
                      </>
                    )}
                    {!candidate.fatherStatus && (candidate.fatherName || candidate.fatherOccupation || candidate.fatherContact) && (
                      <>
                        {candidate.fatherName && (
                          <InfoRow
                            icon={<User className="w-5 h-5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            label="Name"
                            value={candidate.fatherName}
                          />
                        )}
                        {candidate.fatherOccupation && (
                          <InfoRow
                            icon={<Briefcase className="w-5 h-5 text-purple-600" />}
                            iconBg="bg-purple-50"
                            label="Occupation"
                            value={candidate.fatherOccupation}
                          />
                        )}
                        {candidate.fatherContact && (
                          <InfoRow
                            icon={<Phone className="w-5 h-5 text-green-600" />}
                            iconBg="bg-green-50"
                            label="Contact"
                            value={candidate.fatherContact}
                          />
                        )}
                      </>
                    )}
                    {!candidate.fatherStatus && !candidate.fatherName && !candidate.fatherOccupation && !candidate.fatherContact && (
                      <p className="text-sm text-gray-500 italic">No information available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Mother's Information */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="relative">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-pink-600" />
                      Mother's Information
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <SectionCommentsIcon
                        candidateId={candidateId}
                        sectionKey={SECTION_KEYS.MOTHER_INFO}
                        sectionLabel="Mother's Information"
                        commentCount={commentCounts[SECTION_KEYS.MOTHER_INFO] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.MOTHER_INFO] || 0}
                        orgSlug={orgSlug}
                        onCommentAdded={loadCommentCounts}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {candidate.motherStatus && (
                      <InfoRow
                        icon={<Info className="w-5 h-5 text-gray-600" />}
                        iconBg="bg-gray-50"
                        label="Status"
                        value={candidate.motherStatus}
                      />
                    )}
                    {candidate.motherStatus === 'Alive' && (
                      <>
                        {candidate.motherName && (
                          <InfoRow
                            icon={<User className="w-5 h-5 text-pink-600" />}
                            iconBg="bg-pink-50"
                            label="Name"
                            value={candidate.motherName}
                          />
                        )}
                        {candidate.motherOccupation && (
                          <InfoRow
                            icon={<Briefcase className="w-5 h-5 text-purple-600" />}
                            iconBg="bg-purple-50"
                            label="Occupation"
                            value={candidate.motherOccupation}
                          />
                        )}
                        {candidate.motherContact && (
                          <InfoRow
                            icon={<Phone className="w-5 h-5 text-green-600" />}
                            iconBg="bg-green-50"
                            label="Contact"
                            value={candidate.motherContact}
                          />
                        )}
                      </>
                    )}
                    {!candidate.motherStatus && (candidate.motherName || candidate.motherOccupation || candidate.motherContact) && (
                      <>
                        {candidate.motherName && (
                          <InfoRow
                            icon={<User className="w-5 h-5 text-pink-600" />}
                            iconBg="bg-pink-50"
                            label="Name"
                            value={candidate.motherName}
                          />
                        )}
                        {candidate.motherOccupation && (
                          <InfoRow
                            icon={<Briefcase className="w-5 h-5 text-purple-600" />}
                            iconBg="bg-purple-50"
                            label="Occupation"
                            value={candidate.motherOccupation}
                          />
                        )}
                        {candidate.motherContact && (
                          <InfoRow
                            icon={<Phone className="w-5 h-5 text-green-600" />}
                            iconBg="bg-green-50"
                            label="Contact"
                            value={candidate.motherContact}
                          />
                        )}
                      </>
                    )}
                    {!candidate.motherStatus && !candidate.motherName && !candidate.motherOccupation && !candidate.motherContact && (
                      <p className="text-sm text-gray-500 italic">No information available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Emergency Contact */}
                {(candidate.emergencyContactName || candidate.emergencyContactPhone) && (
                  <Card className="border-0 shadow-md">
                    <CardHeader className="relative">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Phone className="w-5 h-5 text-red-600" />
                        Emergency Contact
                      </CardTitle>
                      <div className="absolute top-4 right-4">
                        <SectionCommentsIcon
                          candidateId={candidateId}
                          sectionKey={SECTION_KEYS.EMERGENCY_CONTACT}
                          sectionLabel="Emergency Contact"
                          commentCount={commentCounts[SECTION_KEYS.EMERGENCY_CONTACT] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.EMERGENCY_CONTACT] || 0}
                          orgSlug={orgSlug}
                          onCommentAdded={loadCommentCounts}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {candidate.emergencyContactName && (
                        <InfoRow
                          icon={<User className="w-5 h-5 text-red-600" />}
                          iconBg="bg-red-50"
                          label="Name"
                          value={candidate.emergencyContactName}
                        />
                      )}
                      {candidate.emergencyContactPhone && (
                        <InfoRow
                          icon={<Phone className="w-5 h-5 text-red-600" />}
                          iconBg="bg-red-50"
                          label="Phone"
                          value={candidate.emergencyContactPhone}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Family Address */}
                {candidate.familyAddress && (
                  <Card className="border-0 shadow-md">
                    <CardHeader className="relative">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-orange-600" />
                        Family Address
                      </CardTitle>
                      <div className="absolute top-4 right-4">
                        <SectionCommentsIcon
                          candidateId={candidateId}
                          sectionKey={SECTION_KEYS.FAMILY_ADDRESS}
                          sectionLabel="Family Address"
                          commentCount={commentCounts[SECTION_KEYS.FAMILY_ADDRESS] || 0}
                        unreadCount={unreadCounts[SECTION_KEYS.FAMILY_ADDRESS] || 0}
                          orgSlug={orgSlug}
                          onCommentAdded={loadCommentCounts}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-900">{candidate.familyAddress}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {isEditDialogOpen && candidate && (
        <EditCandidateDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          orgSlug={orgSlug}
          candidate={candidate}
          onSuccess={loadCandidate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Candidate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {candidate.firstName} {candidate.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Picture Modal */}
      {candidate.profilePicture && (
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Profile Picture</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={getImageUrl(candidate.profilePicture)}
                alt={`${candidate.firstName} ${candidate.lastName}`}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Helper component for consistent info rows
interface InfoRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: React.ReactNode;
}

function InfoRow({ icon, iconBg, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-4 group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors">
      <div className={`${iconBg} p-2.5 rounded-lg transition-colors`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">{label}</p>
        <p className="font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
