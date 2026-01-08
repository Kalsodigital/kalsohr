'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, User } from 'lucide-react';
import { toast } from 'sonner';
import { createApplication } from '@/lib/api/org/recruitment';
import { getAllCandidates } from '@/lib/api/org/recruitment';
import { getAllJobPositions } from '@/lib/api/org/job-positions';
import { CreateApplicationData, Candidate } from '@/lib/types/recruitment';

interface CreateApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  onSuccess?: () => void;
  defaultCandidateId?: number; // Pre-select candidate if coming from candidate page
  defaultJobPositionId?: number; // Pre-select job position if coming from job page
}

export function CreateApplicationDialog({
  open,
  onOpenChange,
  orgSlug,
  onSuccess,
  defaultCandidateId,
  defaultJobPositionId,
}: CreateApplicationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobPositions, setJobPositions] = useState<any[]>([]);
  const [formData, setFormData] = useState<CreateApplicationData>({
    candidateId: defaultCandidateId || 0,
    jobPositionId: defaultJobPositionId || 0,
    appliedDate: new Date().toISOString().split('T')[0], // Today's date
    notes: '',
  });

  // Load candidates and job positions when dialog opens
  useEffect(() => {
    const loadOptions = async () => {
      if (!open) return;

      try {
        const [candidatesData, jobPositionsData] = await Promise.all([
          getAllCandidates(orgSlug, { limit: 1000 }), // Get all candidates
          getAllJobPositions(orgSlug, { status: 'Open' }), // Get only open job positions
        ]);
        setCandidates(candidatesData.candidates);
        setJobPositions(jobPositionsData);
      } catch (error) {
        console.error('Failed to load options:', error);
        toast.error('Failed to load candidates or job positions');
      }
    };

    loadOptions();
  }, [open, orgSlug]);

  // Reset form when defaultCandidateId or defaultJobPositionId changes
  useEffect(() => {
    if (defaultCandidateId || defaultJobPositionId) {
      setFormData(prev => ({
        ...prev,
        candidateId: defaultCandidateId || prev.candidateId,
        jobPositionId: defaultJobPositionId || prev.jobPositionId,
      }));
    }
  }, [defaultCandidateId, defaultJobPositionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.candidateId) {
      toast.error('Please select a candidate');
      return;
    }
    if (!formData.jobPositionId) {
      toast.error('Please select a job position');
      return;
    }

    try {
      setLoading(true);
      await createApplication(orgSlug, formData);
      toast.success('Application created successfully');
      onOpenChange(false);
      // Reset form
      setFormData({
        candidateId: 0,
        jobPositionId: 0,
        appliedDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  const selectedCandidate = candidates.find(c => c.id === formData.candidateId);
  const selectedJobPosition = jobPositions.find(j => j.id === formData.jobPositionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {/* Enhanced Header */}
        <DialogHeader className="pb-6 border-b border-gray-200 bg-gray-50 -m-6 p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Create Application
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Link a candidate to a job position
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
          {/* Candidate Selection */}
          <div className="space-y-2">
            <Label htmlFor="candidateId" className="text-sm font-medium text-gray-700">
              Candidate <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.candidateId ? String(formData.candidateId) : ''}
              onValueChange={value => setFormData({ ...formData, candidateId: parseInt(value) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a candidate">
                  {selectedCandidate ? (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>
                        {selectedCandidate.firstName} {selectedCandidate.lastName}
                      </span>
                      <span className="text-gray-500">({selectedCandidate.email})</span>
                    </div>
                  ) : (
                    'Select a candidate'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No candidates found</div>
                ) : (
                  candidates.map(candidate => (
                    <SelectItem key={candidate.id} value={String(candidate.id)}>
                      <div className="flex flex-col py-1">
                        <span className="font-medium">
                          {candidate.firstName} {candidate.lastName}
                        </span>
                        <span className="text-xs text-gray-500">{candidate.email}</span>
                        {candidate.currentCompany && (
                          <span className="text-xs text-gray-500">
                            Current: {candidate.currentCompany}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Job Position Selection */}
          <div className="space-y-2">
            <Label htmlFor="jobPositionId" className="text-sm font-medium text-gray-700">
              Job Position <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.jobPositionId ? String(formData.jobPositionId) : ''}
              onValueChange={value => setFormData({ ...formData, jobPositionId: parseInt(value) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a job position">
                  {selectedJobPosition ? (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      <span>{selectedJobPosition.title}</span>
                      {selectedJobPosition.department && (
                        <span className="text-gray-500">({selectedJobPosition.department.name})</span>
                      )}
                    </div>
                  ) : (
                    'Select a job position'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {jobPositions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No active job positions found</div>
                ) : (
                  jobPositions.map(position => (
                    <SelectItem key={position.id} value={String(position.id)}>
                      <div className="flex flex-col py-1">
                        <span className="font-medium">{position.title}</span>
                        {position.department && (
                          <span className="text-xs text-gray-500">{position.department.name}</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {position.vacancies} {position.vacancies === 1 ? 'vacancy' : 'vacancies'}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Applied Date */}
          <div className="space-y-2">
            <Label htmlFor="appliedDate" className="text-sm font-medium text-gray-700">
              Applied Date
            </Label>
            <input
              type="date"
              id="appliedDate"
              value={formData.appliedDate instanceof Date ? formData.appliedDate.toISOString().split('T')[0] : (formData.appliedDate || '')}
              onChange={e => setFormData({ ...formData, appliedDate: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes about this application..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Summary Box */}
          {selectedCandidate && selectedJobPosition && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-blue-900">Application Summary</div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">{selectedCandidate.firstName} {selectedCandidate.lastName}</span>
                {' is applying for '}
                <span className="font-medium">{selectedJobPosition.title}</span>
                {selectedJobPosition.department && (
                  <span className="text-gray-600"> in {selectedJobPosition.department.name}</span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.candidateId || !formData.jobPositionId}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? 'Creating...' : 'Create Application'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
