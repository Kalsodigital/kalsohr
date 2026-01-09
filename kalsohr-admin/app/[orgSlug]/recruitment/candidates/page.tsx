'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Download,
  Filter,
  X,
  CheckSquare,
  Square,
  Eye,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllCandidates,
  deleteCandidate,
  exportCandidatesCSV,
} from '@/lib/api/org/recruitment';
import {
  Candidate,
  CandidateFilters,
  CANDIDATE_STATUS,
  CANDIDATE_SOURCE,
} from '@/lib/types/recruitment';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import { CreateCandidateDialog } from './create-candidate-dialog';
import { EditCandidateDialog } from './edit-candidate-dialog';

// Helper function to get full image URL
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};

export default function CandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const { hasPermission, isLoading: permissionLoading } = useOrgPermissions();

  // Permission checks
  const canRead = hasPermission('recruitment', 'canRead');
  const canWrite = hasPermission('recruitment', 'canWrite');
  const canUpdate = hasPermission('recruitment', 'canUpdate');
  const canDelete = hasPermission('recruitment', 'canDelete');
  const canExport = hasPermission('recruitment', 'canExport');

  // State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CandidateFilters>({
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProcess: 0,
    selected: 0,
    rejected: 0,
    onHold: 0,
  });

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Show/hide filters
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setFilters(prev => ({ ...prev, page: 1 })); // Reset to page 1 when searching
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load candidates
  useEffect(() => {
    const loadCandidates = async () => {
      if (!canRead) return;

      try {
        setLoading(true);
        const combinedFilters: CandidateFilters = {
          ...filters,
          search: searchQuery || undefined,
        };

        const data = await getAllCandidates(orgSlug, combinedFilters);
        setCandidates(data.candidates);
        setPagination(data.pagination);
        if (data.stats) {
          setStats(data.stats);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load candidates');
      } finally {
        setLoading(false);
      }
    };

    if (!permissionLoading && canRead) {
      loadCandidates();
    }
  }, [filters, searchQuery, refreshTrigger, orgSlug, permissionLoading, canRead]);

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
          <p className="text-gray-500">You don't have permission to view candidates.</p>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!deletingCandidate) return;

    try {
      await deleteCandidate(orgSlug, deletingCandidate.id);
      toast.success('Candidate deleted successfully');
      setDeletingCandidate(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete candidate');
    }
  };

  const handleExportCSV = async () => {
    if (!canExport) {
      toast.error('You do not have permission to export candidates');
      return;
    }

    try {
      setExporting(true);
      const combinedFilters: CandidateFilters = {
        ...filters,
        search: searchQuery || undefined,
      };
      const blob = await exportCandidatesCSV(orgSlug, combinedFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidates_${orgSlug}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Candidates exported successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export candidates');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case CANDIDATE_STATUS.NEW:
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
            New
          </Badge>
        );
      case CANDIDATE_STATUS.IN_PROCESS:
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            In Process
          </Badge>
        );
      case CANDIDATE_STATUS.SELECTED:
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            Selected
          </Badge>
        );
      case CANDIDATE_STATUS.REJECTED:
        return (
          <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">
            Rejected
          </Badge>
        );
      case CANDIDATE_STATUS.ON_HOLD:
        return (
          <Badge variant="default" className="bg-gray-100 text-gray-700 border-gray-200">
            On Hold
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (candidate: Candidate) => {
    const first = candidate.firstName?.[0] || '';
    const last = candidate.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'C';
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 10 });
    setSearchInput('');
    setSearchQuery('');
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map(c => c.id));
    }
  };

  const handleSelectCandidate = (candidateId: number) => {
    if (selectedCandidates.includes(candidateId)) {
      setSelectedCandidates(selectedCandidates.filter(id => id !== candidateId));
    } else {
      setSelectedCandidates([...selectedCandidates, candidateId]);
    }
  };

  const handleClearSelection = () => {
    setSelectedCandidates([]);
  };

  const hasActiveFilters =
    filters.status ||
    filters.source ||
    filters.minExperience !== undefined ||
    filters.maxExperience !== undefined ||
    filters.minSalary !== undefined ||
    filters.maxSalary !== undefined ||
    searchQuery;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Candidates
          </h1>
          <p className="text-gray-600 mt-2">Manage candidate pool for recruitment</p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button
              onClick={handleExportCSV}
              variant="outline"
              disabled={exporting}
              className="border-green-200 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
          {canWrite && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Stats + Search/Filters */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-lg font-semibold text-gray-900">{stats.total}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">New:</span>
                <span className="text-lg font-semibold text-blue-600">{stats.new}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">In Process:</span>
                <span className="text-lg font-semibold text-yellow-600">{stats.inProcess}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Selected:</span>
                <span className="text-lg font-semibold text-green-600">{stats.selected}</span>
              </div>
            </div>
          </div>

          {/* Right side - Search and Filters */}
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, phone..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 h-9 border-gray-200"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="text-gray-600 h-9">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-9 ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-600'}`}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>
          </div>
        </div>

        {/* Advanced Filters (Collapsible) */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-gray-700">Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={value => setFilters({ ...filters, status: value === 'all' ? undefined : value as any, page: 1 })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value={CANDIDATE_STATUS.NEW}>New</SelectItem>
                    <SelectItem value={CANDIDATE_STATUS.IN_PROCESS}>In Process</SelectItem>
                    <SelectItem value={CANDIDATE_STATUS.SELECTED}>Selected</SelectItem>
                    <SelectItem value={CANDIDATE_STATUS.REJECTED}>Rejected</SelectItem>
                    <SelectItem value={CANDIDATE_STATUS.ON_HOLD}>On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-gray-700">Source</Label>
                <Select
                  value={filters.source || 'all'}
                  onValueChange={value => setFilters({ ...filters, source: value === 'all' ? undefined : value as any, page: 1 })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value={CANDIDATE_SOURCE.LINKEDIN}>LinkedIn</SelectItem>
                    <SelectItem value={CANDIDATE_SOURCE.NAUKRI}>Naukri</SelectItem>
                    <SelectItem value={CANDIDATE_SOURCE.INDEED}>Indeed</SelectItem>
                    <SelectItem value={CANDIDATE_SOURCE.REFERRAL}>Referral</SelectItem>
                    <SelectItem value={CANDIDATE_SOURCE.DIRECT}>Direct</SelectItem>
                    <SelectItem value={CANDIDATE_SOURCE.CAREER_PAGE}>Career Page</SelectItem>
                    <SelectItem value={CANDIDATE_SOURCE.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-gray-700">Min Experience (years)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 0"
                  value={filters.minExperience || ''}
                  onChange={e => setFilters({ ...filters, minExperience: e.target.value ? parseInt(e.target.value) : undefined, page: 1 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-700">Max Experience (years)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 10"
                  value={filters.maxExperience || ''}
                  onChange={e => setFilters({ ...filters, maxExperience: e.target.value ? parseInt(e.target.value) : undefined, page: 1 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-700">Min Salary (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 300000"
                  value={filters.minSalary || ''}
                  onChange={e => setFilters({ ...filters, minSalary: e.target.value ? parseInt(e.target.value) : undefined, page: 1 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-700">Max Salary (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 1000000"
                  value={filters.maxSalary || ''}
                  onChange={e => setFilters({ ...filters, maxSalary: e.target.value ? parseInt(e.target.value) : undefined, page: 1 })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedCandidates.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {selectedCandidates.length} candidate(s) selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Clear Selection
              </Button>
              {canDelete && (
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center w-full"
                  >
                    {selectedCandidates.length === candidates.length && candidates.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Expected Salary</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Loading candidates...
                  </TableCell>
                </TableRow>
              ) : candidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No candidates found. {canWrite && 'Click "Add Candidate" to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map(candidate => (
                  <TableRow key={candidate.id} className="hover:bg-gray-50">
                    <TableCell>
                      <button
                        onClick={() => handleSelectCandidate(candidate.id)}
                        className="flex items-center justify-center w-full"
                      >
                        {selectedCandidates.includes(candidate.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={getImageUrl(candidate.profilePicture)}
                            alt={candidate.firstName}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                            {getInitials(candidate)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {candidate.firstName} {candidate.lastName}
                          </div>
                          {candidate.currentCompany && (
                            <div className="text-xs text-gray-500">{candidate.currentCompany}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{candidate.email}</TableCell>
                    <TableCell className="text-sm text-gray-600">{candidate.phone || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {candidate.totalExperience !== null ? `${candidate.totalExperience} yrs` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatCurrency(candidate.expectedSalary)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{candidate.source || '-'}</TableCell>
                    <TableCell>{getStatusBadge(candidate.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {candidate.createdBy && (
                          <AuditHoverIcon
                            moduleCode="recruitment"
                            createdBy={candidate.createdBy}
                            creator={candidate.creator}
                            updatedBy={candidate.updatedBy}
                            updater={candidate.updater}
                            createdAt={candidate.createdAt}
                            updatedAt={candidate.updatedAt}
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/${orgSlug}/recruitment/candidates/${candidate.id}`)}
                          className="h-8 text-gray-600 hover:text-gray-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCandidate(candidate)}
                          disabled={!canUpdate}
                          className="h-8 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={canUpdate ? "Edit Candidate" : "No edit permission"}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCandidate(candidate)}
                          disabled={!canDelete}
                          className="h-8 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={canDelete ? "Delete Candidate" : "No delete permission"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canWrite}
                          className="h-8 text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={canWrite ? "Create Application" : "No create permission"}
                        >
                          <Briefcase className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} candidates
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(filters.limit)}
                onValueChange={value => setFilters({ ...filters, limit: parseInt(value), page: 1 })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1">
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
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCandidate} onOpenChange={() => setDeletingCandidate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Candidate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {deletingCandidate?.firstName} {deletingCandidate?.lastName}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCandidate(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Candidate Dialog */}
      <CreateCandidateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        orgSlug={orgSlug}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />

      {/* Edit Candidate Dialog */}
      {editingCandidate && (
        <EditCandidateDialog
          open={!!editingCandidate}
          onOpenChange={() => setEditingCandidate(null)}
          orgSlug={orgSlug}
          candidate={editingCandidate}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </div>
  );
}
