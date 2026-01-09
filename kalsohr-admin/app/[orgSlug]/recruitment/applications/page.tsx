'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import {
  Plus,
  Search,
  Trash2,
  Shield,
  Filter,
  X,
  Eye,
  Calendar,
  Briefcase,
  LayoutGrid,
  List,
  ChevronRight,
  Clock,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllApplications,
  getApplicationPipeline,
  deleteApplication,
  updateApplicationStatus,
} from '@/lib/api/org/recruitment';
import { getAllJobPositions } from '@/lib/api/org/job-positions';
import {
  Application,
  ApplicationFilters,
  APPLICATION_STATUS,
} from '@/lib/types/recruitment';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { CreateApplicationDialog } from './create-application-dialog';

// Helper function to get full image URL
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};

// Draggable Application Card Component
interface DraggableCardProps {
  application: Application;
  orgSlug: string;
  onViewClick: (id: number) => void;
}

function DraggableCard({ application, orgSlug, onViewClick }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(application.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getInitials = () => {
    const first = application.candidate?.firstName?.[0] || '';
    const last = application.candidate?.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'C';
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 bg-white hover:shadow-lg transition-all cursor-grab active:cursor-grabbing border-l-4 ${
        isDragging ? 'shadow-2xl ring-2 ring-blue-400' : 'hover:border-l-blue-400'
      }`}
    >
      <div className="space-y-3">
        {/* Candidate Info */}
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 flex-shrink-0 ring-2 ring-offset-2 ring-gray-100">
            <AvatarImage
              src={getImageUrl(application.candidate?.profilePicture)}
              alt={application.candidate?.firstName}
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate text-sm">
              {application.candidate?.firstName} {application.candidate?.lastName}
            </h4>
            <p className="text-xs text-gray-600 truncate mt-0.5">
              {application.jobPosition?.title}
            </p>
            {application.candidate?.totalExperience !== null && application.candidate?.totalExperience !== undefined && (
              <p className="text-xs text-gray-500 mt-1">
                {application.candidate?.totalExperience} yrs experience
              </p>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(application.appliedDate)}</span>
          </div>
          {application._count?.interviewSchedules ? (
            <div className="flex items-center gap-1.5 text-blue-600 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>{application._count.interviewSchedules}</span>
            </div>
          ) : null}
        </div>

        {/* View Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
          onClick={(e) => {
            e.stopPropagation();
            onViewClick(application.id);
          }}
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          View Details
        </Button>
      </div>
    </Card>
  );
}

// Droppable Column Component
interface DroppableColumnProps {
  id: string;
  title: string;
  count: number;
  icon: React.ElementType;
  applications: Application[];
  colorClass: string;
  orgSlug: string;
  onViewClick: (id: number) => void;
}

function DroppableColumn({
  id,
  title,
  count,
  icon: Icon,
  applications,
  colorClass,
  orgSlug,
  onViewClick,
}: DroppableColumnProps) {
  const { setNodeRef } = useSortable({ id });

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Column Header */}
      <div className={`p-4 rounded-t-xl border-2 ${colorClass} backdrop-blur-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/80 shadow-sm">
              <Icon className="w-4 h-4 text-gray-700" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
              <p className="text-xs text-gray-600 mt-0.5">{count} {count === 1 ? 'application' : 'applications'}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white/90 text-gray-900 font-semibold px-3 shadow-sm">
            {count}
          </Badge>
        </div>
      </div>

      {/* Enhanced Column Content with Droppable Area */}
      <div
        ref={setNodeRef}
        className="flex-1 border-l-2 border-r-2 border-b-2 border-gray-200 rounded-b-xl p-4 bg-gradient-to-b from-gray-50/50 to-white min-h-[500px] max-h-[700px] overflow-y-auto space-y-3 custom-scrollbar"
      >
        <SortableContext items={applications.map(app => String(app.id))} strategy={verticalListSortingStrategy}>
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <Icon className="w-16 h-16 mb-3 opacity-20" />
              <p className="text-sm font-medium">No applications</p>
              <p className="text-xs mt-1">Drag cards here</p>
            </div>
          ) : (
            applications.map((app) => (
              <DraggableCard
                key={app.id}
                application={app}
                orgSlug={orgSlug}
                onViewClick={onViewClick}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

type ViewMode = 'kanban' | 'list';

export default function ApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const { hasPermission, isLoading: permissionLoading } = useOrgPermissions();

  // Permission checks
  const canRead = hasPermission('recruitment', 'canRead');
  const canWrite = hasPermission('recruitment', 'canWrite');
  const canUpdate = hasPermission('recruitment', 'canUpdate');
  const canDelete = hasPermission('recruitment', 'canDelete');

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [applications, setApplications] = useState<Application[]>([]);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<ApplicationFilters>({
    page: 1,
    limit: 100,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });

  // Filter options
  const [jobPositions, setJobPositions] = useState<any[]>([]);

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deletingApplication, setDeletingApplication] = useState<Application | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Drag and Drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Load applications
  useEffect(() => {
    const loadData = async () => {
      if (!canRead) return;

      try {
        setLoading(true);
        if (viewMode === 'kanban') {
          const data = await getApplicationPipeline(orgSlug, filters.jobPositionId);
          setPipelineData(data);
        } else {
          const data = await getAllApplications(orgSlug, filters);
          setApplications(data.applications);
          setPagination(data.pagination);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };

    if (!permissionLoading && canRead) {
      loadData();
    }
  }, [filters, refreshTrigger, viewMode, orgSlug, permissionLoading, canRead]);

  // Load job positions
  useEffect(() => {
    const loadJobPositions = async () => {
      if (!canRead) return;

      try {
        const positions = await getAllJobPositions(orgSlug, { status: 'active' });
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
          <p className="text-gray-500">You don't have permission to view applications.</p>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!deletingApplication) return;

    try {
      await deleteApplication(orgSlug, deletingApplication.id);
      toast.success('Application deleted successfully');
      setDeletingApplication(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete application');
    }
  };

  const handleStatusChange = async (applicationId: number, newStatus: string) => {
    if (!canUpdate) {
      toast.error('You do not have permission to update applications');
      return;
    }

    try {
      await updateApplicationStatus(orgSlug, applicationId, newStatus);
      toast.success('Application status updated');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over || !canUpdate) return;

    const applicationId = parseInt(active.id as string);
    const newStatus = over.id as string;

    // Find the application
    const application = Object.values(pipelineData.pipeline)
      .flat()
      .find((app: any) => app.id === applicationId);

    if (!application || (application as any).status === newStatus) return;

    // Update status via API
    try {
      await updateApplicationStatus(orgSlug, applicationId, newStatus);
      toast.success(`Application moved to ${newStatus}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case APPLICATION_STATUS.APPLIED:
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
            Applied
          </Badge>
        );
      case APPLICATION_STATUS.SHORTLISTED:
        return (
          <Badge variant="default" className="bg-purple-100 text-purple-700 border-purple-200">
            Shortlisted
          </Badge>
        );
      case APPLICATION_STATUS.INTERVIEW_SCHEDULED:
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Interview Scheduled
          </Badge>
        );
      case APPLICATION_STATUS.SELECTED:
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            Selected
          </Badge>
        );
      case APPLICATION_STATUS.REJECTED:
        return (
          <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (application: Application) => {
    const first = application.candidate?.firstName?.[0] || '';
    const last = application.candidate?.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'C';
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: viewMode === 'kanban' ? 100 : 10 });
    setSearchInput('');
  };

  const hasActiveFilters = filters.jobPositionId || filters.status || searchInput;

  // Kanban column colors
  const getColumnColor = (status: string) => {
    switch (status) {
      case 'Applied':
        return 'border-blue-200 bg-blue-50';
      case 'Shortlisted':
        return 'border-purple-200 bg-purple-50';
      case 'Interview Scheduled':
        return 'border-yellow-200 bg-yellow-50';
      case 'Selected':
        return 'border-green-200 bg-green-50';
      case 'Rejected':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const renderKanbanView = () => {
    if (!pipelineData) return null;

    const columns = [
      { title: 'Applied', key: 'Applied', icon: Users, color: 'border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/50' },
      { title: 'Shortlisted', key: 'Shortlisted', icon: UserCheck, color: 'border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100/50' },
      { title: 'Interviews', key: 'Interview Scheduled', icon: Calendar, color: 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100/50' },
      { title: 'Selected', key: 'Selected', icon: UserCheck, color: 'border-green-300 bg-gradient-to-br from-green-50 to-green-100/50' },
      { title: 'Rejected', key: 'Rejected', icon: UserX, color: 'border-red-300 bg-gradient-to-br from-red-50 to-red-100/50' },
    ];

    const handleViewClick = (id: number) => {
      router.push(`/${orgSlug}/recruitment/applications/${id}`);
    };

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 auto-rows-fr">
          <SortableContext items={columns.map(col => col.key)} strategy={verticalListSortingStrategy}>
            {columns.map(column => {
              const apps = pipelineData.pipeline[column.key] || [];
              const count = pipelineData.counts[column.key] || 0;

              return (
                <DroppableColumn
                  key={column.key}
                  id={column.key}
                  title={column.title}
                  count={count}
                  icon={column.icon}
                  applications={apps}
                  colorClass={column.color}
                  orgSlug={orgSlug}
                  onViewClick={handleViewClick}
                />
              );
            })}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeId ? (
            <Card className="p-4 shadow-2xl ring-2 ring-blue-500 rotate-3 bg-white opacity-90">
              <div className="text-sm font-semibold text-gray-900">Dragging...</div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const renderListView = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Candidate</TableHead>
              <TableHead>Job Position</TableHead>
              <TableHead>Applied Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Interviews</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Loading applications...
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No applications found. {canWrite && 'Click "Create Application" to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              applications.map(app => (
                <TableRow key={app.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={getImageUrl(app.candidate?.profilePicture)}
                          alt={app.candidate?.firstName}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                          {getInitials(app)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {app.candidate?.firstName} {app.candidate?.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{app.candidate?.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{app.jobPosition?.title}</div>
                      <div className="text-xs text-gray-500">{app.jobPosition?.department?.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(app.appliedDate)}</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{app._count?.interviewSchedules || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${orgSlug}/recruitment/applications/${app.id}`)}
                        className="h-8 text-gray-600 hover:text-gray-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingApplication(app)}
                        disabled={!canDelete}
                        className="h-8 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={canDelete ? "Delete Application" : "No delete permission"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} applications
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
            Applications
          </h1>
          <p className="text-gray-600 mt-2">Track candidate applications and hiring pipeline</p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Application
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Filters + View Toggle */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
          {/* Left side - Stats */}
          {viewMode === 'kanban' && pipelineData && (
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-lg font-semibold text-gray-900">{pipelineData.counts.total}</span>
                </div>
              </div>
            </div>
          )}

          {/* Right side - Filters and View Toggle */}
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
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

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="text-gray-600 h-9">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}

            {/* View Toggle */}
            <div className="flex items-center gap-1 border border-gray-200 rounded-md p-1 bg-white">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="h-7"
              >
                <LayoutGrid className="w-4 h-4" />
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
        </div>

        {/* Main Content */}
        {viewMode === 'kanban' ? renderKanbanView() : renderListView()}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingApplication} onOpenChange={() => setDeletingApplication(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete this application? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingApplication(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Application Dialog */}
      <CreateApplicationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        orgSlug={orgSlug}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
    </div>
  );
}
