'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Trash2,
  Shield,
  Filter,
  X,
  Eye,
  Calendar as CalendarIcon,
  Video,
  Phone,
  MapPin,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllInterviewSchedules,
  getInterviewSchedulesByDate,
  getMyInterviews,
  deleteInterviewSchedule,
} from '@/lib/api/org/recruitment';
import { getAllJobPositions } from '@/lib/api/org/job-positions';
import {
  InterviewSchedule,
  InterviewFilters,
  INTERVIEW_STATUS,
  INTERVIEW_MODE,
} from '@/lib/types/recruitment';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { CreateInterviewDialog } from './create-interview-dialog';

// Helper function to get full image URL
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};

type ViewMode = 'calendar' | 'list';

export default function InterviewsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const applicationIdFromUrl = searchParams.get('applicationId');

  const { hasPermission, isLoading: permissionLoading } = useOrgPermissions();

  // Permission checks
  const canRead = hasPermission('recruitment', 'canRead');
  const canWrite = hasPermission('recruitment', 'canWrite');
  const canUpdate = hasPermission('recruitment', 'canUpdate');
  const canDelete = hasPermission('recruitment', 'canDelete');

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([]);
  const [calendarData, setCalendarData] = useState<Record<string, InterviewSchedule[]>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InterviewFilters>({
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [myInterviewsOnly, setMyInterviewsOnly] = useState(false);

  // Filter options
  const [jobPositions, setJobPositions] = useState<any[]>([]);

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deletingInterview, setDeletingInterview] = useState<InterviewSchedule | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load interviews
  useEffect(() => {
    const loadData = async () => {
      if (!canRead) return;

      try {
        setLoading(true);
        if (viewMode === 'calendar') {
          const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
            .toISOString()
            .split('T')[0];
          const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
            .toISOString()
            .split('T')[0];
          const data = await getInterviewSchedulesByDate(orgSlug, startDate, endDate);
          setCalendarData(data.interviews);
        } else {
          if (myInterviewsOnly) {
            const myInterviews = await getMyInterviews(orgSlug, filters.upcoming);
            setInterviews(myInterviews);
            setPagination({ page: 1, limit: 20, total: myInterviews.length, totalPages: 1 });
          } else {
            const data = await getAllInterviewSchedules(orgSlug, filters);
            setInterviews(data.interviews);
            setPagination(data.pagination);
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load interviews');
      } finally {
        setLoading(false);
      }
    };

    if (!permissionLoading && canRead) {
      loadData();
    }
  }, [filters, refreshTrigger, viewMode, currentMonth, myInterviewsOnly, orgSlug, permissionLoading, canRead]);

  // Load job positions
  useEffect(() => {
    const loadJobPositions = async () => {
      if (!canRead) return;

      try {
        const positions = await getAllJobPositions(orgSlug, {});
        setJobPositions(positions);
      } catch (error) {
        console.error('Failed to load job positions:', error);
      }
    };

    if (!permissionLoading && canRead) {
      loadJobPositions();
    }
  }, [orgSlug, permissionLoading, canRead]);

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
          <p className="text-gray-500">You don't have permission to view interviews.</p>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!deletingInterview) return;

    try {
      await deleteInterviewSchedule(orgSlug, deletingInterview.id);
      toast.success('Interview deleted successfully');
      setDeletingInterview(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete interview');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case INTERVIEW_STATUS.SCHEDULED:
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
            Scheduled
          </Badge>
        );
      case INTERVIEW_STATUS.COMPLETED:
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            Completed
          </Badge>
        );
      case INTERVIEW_STATUS.CANCELLED:
        return (
          <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">
            Cancelled
          </Badge>
        );
      case INTERVIEW_STATUS.RESCHEDULED:
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Rescheduled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case INTERVIEW_MODE.VIDEO:
        return <Video className="w-4 h-4 text-blue-600" />;
      case INTERVIEW_MODE.PHONE:
        return <Phone className="w-4 h-4 text-green-600" />;
      case INTERVIEW_MODE.IN_PERSON:
        return <MapPin className="w-4 h-4 text-purple-600" />;
      default:
        return <CalendarIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTime = (dateString: string | Date) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 });
    setMyInterviewsOnly(false);
  };

  const hasActiveFilters = filters.status || filters.jobPositionId || myInterviewsOnly;

  // Calendar generation
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getInterviewsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateKey = date.toISOString().split('T')[0];
    return calendarData[dateKey] || [];
  };

  const renderCalendarView = () => {
    const days = getDaysInMonth(currentMonth);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Week day headers */}
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600 bg-gray-50 border-b border-gray-200">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((date, index) => {
            const dayInterviews = getInterviewsForDate(date);
            const isToday = date && date.toDateString() === new Date().toDateString();
            const isCurrentMonth = date !== null;

            return (
              <div
                key={index}
                className={`min-h-[120px] border-b border-r border-gray-200 p-2 ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayInterviews.slice(0, 3).map(interview => {
                        // Get status color
                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case INTERVIEW_STATUS.SCHEDULED:
                              return 'bg-blue-500';
                            case INTERVIEW_STATUS.COMPLETED:
                              return 'bg-green-500';
                            case INTERVIEW_STATUS.CANCELLED:
                              return 'bg-red-500';
                            case INTERVIEW_STATUS.RESCHEDULED:
                              return 'bg-yellow-500';
                            default:
                              return 'bg-gray-500';
                          }
                        };

                        return (
                          <Card
                            key={interview.id}
                            className="p-1.5 cursor-pointer hover:shadow-sm transition-shadow text-xs"
                            onClick={() => router.push(`/${orgSlug}/recruitment/interviews/${interview.id}`)}
                          >
                            <div className="flex items-start gap-1">
                              {getModeIcon(interview.interviewMode)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(interview.status)} flex-shrink-0`} />
                                  <div className="font-medium text-gray-900 truncate">
                                    {formatTime(interview.interviewDate)}
                                  </div>
                                </div>
                                <div className="text-gray-600 truncate">
                                  {interview.application?.candidate?.firstName} {interview.application?.candidate?.lastName}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                      {dayInterviews.length > 3 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{dayInterviews.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Date & Time</TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Job Position</TableHead>
              <TableHead>Round</TableHead>
              <TableHead>Interviewer</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  Loading interviews...
                </TableCell>
              </TableRow>
            ) : interviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No interviews found. {canWrite && 'Click "Schedule Interview" to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              interviews.map(interview => (
                <TableRow key={interview.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{formatDate(interview.interviewDate)}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(interview.interviewDate)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={getImageUrl(interview.application?.candidate?.profilePicture)}
                          alt={interview.application?.candidate?.firstName}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                          {interview.application?.candidate?.firstName?.[0]}
                          {interview.application?.candidate?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {interview.application?.candidate?.firstName} {interview.application?.candidate?.lastName}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {interview.application?.jobPosition?.title}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{interview.roundName}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {interview.interviewer ? (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {interview.interviewer.firstName} {interview.interviewer.lastName}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getModeIcon(interview.interviewMode)}
                      <span className="text-sm text-gray-600">{interview.interviewMode}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(interview.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${orgSlug}/recruitment/interviews/${interview.id}`)}
                        className="h-8 text-gray-600 hover:text-gray-900"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingInterview(interview)}
                          className="h-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination for List View */}
        {!loading && viewMode === 'list' && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} interviews
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Interview Schedule
          </h1>
          <p className="text-gray-600 mt-2">Manage and track candidate interviews</p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Interview
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Filters + View Toggle */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
          {/* Left side - Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                id="my-interviews"
                checked={myInterviewsOnly}
                onCheckedChange={checked => setMyInterviewsOnly(!!checked)}
              />
              <Label htmlFor="my-interviews" className="text-sm cursor-pointer">
                My Interviews Only
              </Label>
            </div>

            {viewMode === 'list' && (
              <>
                <div className="w-48">
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={value =>
                      setFilters({ ...filters, status: value === 'all' ? undefined : (value as any), page: 1 })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value={INTERVIEW_STATUS.SCHEDULED}>Scheduled</SelectItem>
                      <SelectItem value={INTERVIEW_STATUS.COMPLETED}>Completed</SelectItem>
                      <SelectItem value={INTERVIEW_STATUS.CANCELLED}>Cancelled</SelectItem>
                      <SelectItem value={INTERVIEW_STATUS.RESCHEDULED}>Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-48">
                  <Select
                    value={filters.jobPositionId ? String(filters.jobPositionId) : 'all'}
                    onValueChange={value =>
                      setFilters({ ...filters, jobPositionId: value === 'all' ? undefined : parseInt(value), page: 1 })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All positions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All positions</SelectItem>
                      {jobPositions.map(pos => (
                        <SelectItem key={pos.id} value={String(pos.id)}>
                          {pos.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="text-gray-600 h-9">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Right side - View Toggle */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-md p-1 bg-white">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="h-7"
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === 'calendar' ? renderCalendarView() : renderListView()}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingInterview} onOpenChange={() => setDeletingInterview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Interview</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete this interview schedule? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingInterview(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Interview Dialog */}
      <CreateInterviewDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        orgSlug={orgSlug}
        defaultApplicationId={applicationIdFromUrl ? parseInt(applicationIdFromUrl) : undefined}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
    </div>
  );
}
