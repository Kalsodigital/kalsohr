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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Video, Phone, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import { createInterviewSchedule, getAllApplications } from '@/lib/api/org/recruitment';
import { getOrgUsers } from '@/lib/api/org/users';
import { CreateInterviewScheduleData, Application, INTERVIEW_MODE } from '@/lib/types/recruitment';

interface CreateInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  onSuccess?: () => void;
  defaultApplicationId?: number; // Pre-select application if coming from application page
}

export function CreateInterviewDialog({
  open,
  onOpenChange,
  orgSlug,
  onSuccess,
  defaultApplicationId,
}: CreateInterviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState<CreateInterviewScheduleData>({
    applicationId: defaultApplicationId || 0,
    roundName: '',
    interviewDate: '',
    interviewMode: INTERVIEW_MODE.VIDEO,
    location: '',
    meetingLink: '',
    interviewerId: 0,
  });

  // Load applications and users when dialog opens
  useEffect(() => {
    const loadOptions = async () => {
      if (!open) return;

      try {
        const [applicationsData, usersData] = await Promise.all([
          getAllApplications(orgSlug, { limit: 1000 }), // Get all applications
          getOrgUsers(orgSlug, { limit: 1000, isActive: true }), // Get all active users
        ]);
        setApplications(applicationsData.applications);
        setUsers(usersData.users);
      } catch (error) {
        console.error('Failed to load options:', error);
        toast.error('Failed to load applications or users');
      }
    };

    loadOptions();
  }, [open, orgSlug]);

  // Reset form when defaultApplicationId changes
  useEffect(() => {
    if (defaultApplicationId) {
      setFormData(prev => ({
        ...prev,
        applicationId: defaultApplicationId,
      }));
    }
  }, [defaultApplicationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.applicationId) {
      toast.error('Please select an application');
      return;
    }
    if (!formData.roundName.trim()) {
      toast.error('Please enter a round name');
      return;
    }
    if (!formData.interviewDate) {
      toast.error('Please select interview date and time');
      return;
    }
    if (formData.interviewMode === INTERVIEW_MODE.IN_PERSON && !formData.location?.trim()) {
      toast.error('Please enter location for in-person interview');
      return;
    }
    if (
      (formData.interviewMode === INTERVIEW_MODE.VIDEO || formData.interviewMode === INTERVIEW_MODE.PHONE) &&
      !formData.meetingLink?.trim()
    ) {
      toast.error('Please enter meeting link for video/phone interview');
      return;
    }

    try {
      setLoading(true);

      // Convert datetime-local to ISO string with timezone
      const localDateTime = new Date(formData.interviewDate);
      const isoDateTime = localDateTime.toISOString();

      // Prepare data to send
      const dataToSend: CreateInterviewScheduleData = {
        applicationId: formData.applicationId,
        roundName: formData.roundName.trim(),
        interviewDate: isoDateTime,
        interviewMode: formData.interviewMode,
        notes: formData.notes?.trim() || undefined,
      };

      // Add conditional fields based on interview mode
      if (formData.interviewMode === INTERVIEW_MODE.IN_PERSON) {
        dataToSend.location = formData.location?.trim();
      } else {
        dataToSend.meetingLink = formData.meetingLink?.trim();
      }

      // Add interviewer if selected
      if (formData.interviewerId) {
        dataToSend.interviewerId = formData.interviewerId;
      }

      await createInterviewSchedule(orgSlug, dataToSend);
      toast.success('Interview scheduled successfully');
      onOpenChange(false);

      // Reset form
      setFormData({
        applicationId: 0,
        roundName: '',
        interviewDate: '',
        interviewMode: INTERVIEW_MODE.VIDEO,
        location: '',
        meetingLink: '',
        interviewerId: 0,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  const selectedApplication = applications.find(a => a.id === formData.applicationId);
  const selectedUser = users.find(u => u.id === formData.interviewerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Enhanced Header */}
        <DialogHeader className="pb-6 border-b border-gray-200 bg-gray-50 -m-6 p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Schedule Interview
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Set up an interview for a candidate application
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
          {/* Application Selection */}
          <div className="space-y-2">
            <Label htmlFor="applicationId" className="text-sm font-medium text-gray-700">
              Application <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.applicationId ? String(formData.applicationId) : ''}
              onValueChange={value => setFormData({ ...formData, applicationId: parseInt(value) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an application">
                  {selectedApplication ? (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>
                        {selectedApplication.candidate?.firstName} {selectedApplication.candidate?.lastName}
                      </span>
                      <span className="text-gray-500">- {selectedApplication.jobPosition?.title}</span>
                    </div>
                  ) : (
                    'Select an application'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {applications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No applications found</div>
                ) : (
                  applications.map(app => (
                    <SelectItem key={app.id} value={String(app.id)}>
                      <div className="flex flex-col py-1">
                        <span className="font-medium">
                          {app.candidate?.firstName} {app.candidate?.lastName}
                        </span>
                        <span className="text-xs text-gray-500">
                          Applied for: {app.jobPosition?.title}
                        </span>
                        {app.candidate?.totalExperience !== null && (
                          <span className="text-xs text-gray-500">
                            Experience: {app.candidate.totalExperience} years
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Round Name */}
          <div className="space-y-2">
            <Label htmlFor="roundName" className="text-sm font-medium text-gray-700">
              Round Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="roundName"
              value={formData.roundName}
              onChange={e => setFormData({ ...formData, roundName: e.target.value })}
              placeholder="e.g., Technical Round 1, HR Interview, Final Round"
            />
          </div>

          {/* Interview Date & Time */}
          <div className="space-y-2">
            <Label htmlFor="interviewDate" className="text-sm font-medium text-gray-700">
              Interview Date & Time <span className="text-red-500">*</span>
            </Label>
            <input
              type="datetime-local"
              id="interviewDate"
              value={formData.interviewDate}
              onChange={e => setFormData({ ...formData, interviewDate: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Interview Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Interview Mode <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.interviewMode}
              onValueChange={value =>
                setFormData({ ...formData, interviewMode: value as typeof INTERVIEW_MODE[keyof typeof INTERVIEW_MODE] })
              }
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem
                  value={INTERVIEW_MODE.IN_PERSON}
                  id="in-person"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="in-person"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                >
                  <MapPin className="mb-3 h-6 w-6" />
                  <span className="font-medium">In-person</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value={INTERVIEW_MODE.VIDEO} id="video" className="peer sr-only" />
                <Label
                  htmlFor="video"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                >
                  <Video className="mb-3 h-6 w-6" />
                  <span className="font-medium">Video</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value={INTERVIEW_MODE.PHONE} id="phone" className="peer sr-only" />
                <Label
                  htmlFor="phone"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                >
                  <Phone className="mb-3 h-6 w-6" />
                  <span className="font-medium">Phone</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional: Location (for In-person) */}
          {formData.interviewMode === INTERVIEW_MODE.IN_PERSON && (
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                Location <span className="text-red-500">*</span>
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Office Building A, Floor 3, Meeting Room 1"
              />
            </div>
          )}

          {/* Conditional: Meeting Link (for Video/Phone) */}
          {(formData.interviewMode === INTERVIEW_MODE.VIDEO || formData.interviewMode === INTERVIEW_MODE.PHONE) && (
            <div className="space-y-2">
              <Label htmlFor="meetingLink" className="text-sm font-medium text-gray-700">
                Meeting Link <span className="text-red-500">*</span>
              </Label>
              <Input
                id="meetingLink"
                type="url"
                value={formData.meetingLink}
                onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                placeholder="e.g., https://meet.google.com/abc-defg-hij or https://zoom.us/j/1234567890"
              />
            </div>
          )}

          {/* Interviewer Selection */}
          <div className="space-y-2">
            <Label htmlFor="interviewerId" className="text-sm font-medium text-gray-700">
              Interviewer (Optional)
            </Label>
            <Select
              value={formData.interviewerId ? String(formData.interviewerId) : ''}
              onValueChange={value => setFormData({ ...formData, interviewerId: value ? parseInt(value) : 0 })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an interviewer (optional)">
                  {selectedUser ? (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>
                        {selectedUser.firstName} {selectedUser.lastName}
                      </span>
                      {selectedUser.role && (
                        <span className="text-gray-500">({selectedUser.role.name})</span>
                      )}
                    </div>
                  ) : (
                    'Select an interviewer (optional)'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {users.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No active users found
                  </div>
                ) : (
                  users.map(user => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      <div className="flex flex-col py-1">
                        <span className="font-medium">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                        {user.role && (
                          <span className="text-xs text-gray-500">{user.role.name}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Box */}
          {selectedApplication && formData.roundName && formData.interviewDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-blue-900">Interview Summary</div>
              <div className="text-sm text-gray-700">
                <div>
                  <span className="font-medium">{formData.roundName}</span> for{' '}
                  <span className="font-medium">
                    {selectedApplication.candidate?.firstName} {selectedApplication.candidate?.lastName}
                  </span>
                </div>
                <div className="text-gray-600 mt-1">
                  Position: {selectedApplication.jobPosition?.title}
                </div>
                <div className="text-gray-600">
                  Date: {new Date(formData.interviewDate).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </div>
                <div className="text-gray-600">
                  Mode: {formData.interviewMode}
                  {formData.interviewMode === INTERVIEW_MODE.IN_PERSON && formData.location && ` - ${formData.location}`}
                </div>
                {selectedUser && (
                  <div className="text-gray-600">
                    Interviewer: {selectedUser.firstName} {selectedUser.lastName}
                  </div>
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
              disabled={loading || !formData.applicationId || !formData.roundName || !formData.interviewDate}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? 'Scheduling...' : 'Schedule Interview'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
