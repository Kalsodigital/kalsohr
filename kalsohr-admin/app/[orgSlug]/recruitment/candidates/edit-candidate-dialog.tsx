'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SalaryInput } from '@/components/ui/salary-input';
import { toast } from 'sonner';
import { updateCandidate } from '@/lib/api/org/recruitment';
import { getAllCountries, getAllStates, getAllCities } from '@/lib/api/org/locations';
import { getAllMaritalStatuses } from '@/lib/api/masters/marital-status';
import { getAllEducationLevels } from '@/lib/api/org/education-levels';
import {
  Candidate,
  UpdateCandidateData,
  CANDIDATE_STATUS,
  CANDIDATE_SOURCE,
} from '@/lib/types/recruitment';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  User,
  Camera,
  Briefcase,
  Users,
  FileText,
  X,
} from 'lucide-react';

interface EditCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  candidate: Candidate;
  onSuccess: () => void;
}

const STEPS = [
  { number: 1, title: 'Basic Information', icon: User },
  { number: 2, title: 'Professional Details', icon: Briefcase },
  { number: 3, title: 'Family & Personal', icon: Users },
  { number: 4, title: 'Application Details', icon: FileText },
];

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="pb-3 mb-6 border-b border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

const FormSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-gradient-to-br from-gray-50/50 to-white p-6 rounded-lg border border-gray-100 ${className}`}>
    {children}
  </div>
);

// Helper to get image URL
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};

export function EditCandidateDialog({ open, onOpenChange, orgSlug, candidate, onSuccess }: EditCandidateDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState<UpdateCandidateData>({});

  // File uploads
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Master data
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<any[]>([]);
  const [educationLevels, setEducationLevels] = useState<any[]>([]);
  const [genders] = useState([
    { id: 1, name: 'Male', code: 'M' },
    { id: 2, name: 'Female', code: 'F' },
    { id: 3, name: 'Other', code: 'O' },
  ]);

  // Initialize form with candidate data
  useEffect(() => {
    if (open && candidate) {
      setCurrentStep(1);
      setFormData({
        firstName: candidate.firstName,
        lastName: candidate.lastName || undefined,
        email: candidate.email,
        phone: candidate.phone || undefined,
        alternatePhone: candidate.alternatePhone || undefined,
        dateOfBirth: candidate.dateOfBirth ? (typeof candidate.dateOfBirth === 'string' ? candidate.dateOfBirth.split('T')[0] : new Date(candidate.dateOfBirth).toISOString().split('T')[0]) : undefined,
        genderId: candidate.genderId || undefined,
        maritalStatusId: candidate.maritalStatusId || undefined,
        currentCompany: candidate.currentCompany || undefined,
        totalExperience: candidate.totalExperience || undefined,
        currentSalary: candidate.currentSalary || undefined,
        expectedSalary: candidate.expectedSalary || undefined,
        noticePeriod: candidate.noticePeriod || undefined,
        skills: candidate.skills || undefined,
        qualifications: candidate.qualifications || undefined,
        educationLevelId: candidate.educationLevelId || undefined,
        fatherStatus: candidate.fatherStatus || undefined,
        fatherName: candidate.fatherName || undefined,
        fatherOccupation: candidate.fatherOccupation || undefined,
        fatherContact: candidate.fatherContact || undefined,
        motherStatus: candidate.motherStatus || undefined,
        motherName: candidate.motherName || undefined,
        motherOccupation: candidate.motherOccupation || undefined,
        motherContact: candidate.motherContact || undefined,
        familyAddress: candidate.familyAddress || undefined,
        emergencyContactName: candidate.emergencyContactName || undefined,
        emergencyContactPhone: candidate.emergencyContactPhone || undefined,
        source: candidate.source || undefined,
        referredBy: candidate.referredBy || undefined,
        currentAddress: candidate.currentAddress || undefined,
        permanentAddress: candidate.permanentAddress || undefined,
        cityId: candidate.cityId || undefined,
        postalCode: candidate.postalCode || undefined,
        notes: candidate.notes || undefined,
        status: candidate.status,
      });
      setProfilePicturePreview(getImageUrl(candidate.profilePicture));
      setProfilePictureFile(null);
      setResumeFile(null);
      loadMasterData();
    }
  }, [open, candidate]);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const [countriesList, citiesList, maritalStatusList, educationLevelsList] = await Promise.all([
        getAllCountries(orgSlug, true),
        getAllCities(orgSlug, undefined, undefined, true),
        getAllMaritalStatuses(orgSlug, true),
        getAllEducationLevels(orgSlug, true),
      ]);

      setCountries(countriesList);
      setCities(citiesList);
      setMaritalStatuses(maritalStatusList);
      setEducationLevels(educationLevelsList);
    } catch (error) {
      console.error('Failed to load master data:', error);
      toast.error('Failed to load form options');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Profile picture must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Resume must be less than 10MB');
        return;
      }
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a PDF, DOC, or DOCX file');
        return;
      }
      setResumeFile(file);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.firstName?.trim()) {
          toast.error('First name is required');
          return false;
        }
        if (!formData.email?.trim()) {
          toast.error('Email is required');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          toast.error('Please enter a valid email address');
          return false;
        }
        return true;
      case 2:
      case 3:
        return true;
      case 4:
        if (formData.source && formData.source === CANDIDATE_SOURCE.REFERRAL) {
          if (!formData.referredBy?.trim()) {
            toast.error('Referred by is required when source is Referral');
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName?.trim() && formData.email?.trim());
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setIsSubmitting(true);
      await updateCandidate(orgSlug, candidate.id, formData, resumeFile, profilePictureFile);
      toast.success('Candidate updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update candidate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <SectionHeader
              title="Basic Information"
              subtitle="Update candidate's personal details"
            />

            <FormSection>
              {/* Profile Picture Upload */}
              <div className="mb-6 flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden border-2 border-blue-200">
                    {profilePicturePreview ? (
                      <img
                        src={profilePicturePreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-blue-600" />
                    )}
                  </div>
                  <label
                    htmlFor="profile-picture-edit"
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="profile-picture-edit"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                    />
                  </label>
                </div>
                {profilePictureFile ? (
                  <p className="text-xs text-green-600 mt-2">New: {profilePictureFile.name}</p>
                ) : candidate.profilePicture ? (
                  <p className="text-xs text-gray-500 mt-2">Existing picture</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.firstName || ''}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={formData.lastName || ''}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Alternate Phone</Label>
                  <Input
                    type="tel"
                    value={formData.alternatePhone || ''}
                    onChange={e => setFormData({ ...formData, alternatePhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth ? (typeof formData.dateOfBirth === 'string' ? formData.dateOfBirth : formData.dateOfBirth.toISOString().split('T')[0]) : ''}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Gender</Label>
                  <Select
                    value={formData.genderId ? String(formData.genderId) : undefined}
                    onValueChange={value => setFormData({ ...formData, genderId: parseInt(value) })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genders.map(gender => (
                        <SelectItem key={gender.id} value={String(gender.id)}>
                          {gender.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Marital Status</Label>
                  <Select
                    value={formData.maritalStatusId ? String(formData.maritalStatusId) : undefined}
                    onValueChange={value => setFormData({ ...formData, maritalStatusId: parseInt(value) })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      {maritalStatuses.map(status => (
                        <SelectItem key={status.id} value={String(status.id)}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <SectionHeader
              title="Professional Details"
              subtitle="Update work experience and qualifications"
            />

            <FormSection>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Current Company</Label>
                  <Input
                    value={formData.currentCompany || ''}
                    onChange={e => setFormData({ ...formData, currentCompany: e.target.value })}
                    placeholder="ABC Corp"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Total Experience (years)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.totalExperience !== undefined ? formData.totalExperience : ''}
                    onChange={e => setFormData({ ...formData, totalExperience: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="5"
                    className="mt-1"
                  />
                </div>

                <SalaryInput
                  label="Current Salary"
                  value={formData.currentSalary}
                  onChange={value => setFormData({ ...formData, currentSalary: value })}
                  placeholder="50000"
                />

                <SalaryInput
                  label="Expected Salary"
                  value={formData.expectedSalary}
                  onChange={value => setFormData({ ...formData, expectedSalary: value })}
                  placeholder="60000"
                />

                <div>
                  <Label>Notice Period (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.noticePeriod !== undefined ? formData.noticePeriod : ''}
                    onChange={e => setFormData({ ...formData, noticePeriod: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="30"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Education Level</Label>
                  <Select
                    value={formData.educationLevelId ? String(formData.educationLevelId) : undefined}
                    onValueChange={value => setFormData({ ...formData, educationLevelId: parseInt(value) })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map(level => (
                        <SelectItem key={level.id} value={String(level.id)}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>Skills (comma-separated)</Label>
                  <Textarea
                    value={formData.skills || ''}
                    onChange={e => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="React, Node.js, TypeScript, AWS"
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Qualifications</Label>
                  <Textarea
                    value={formData.qualifications || ''}
                    onChange={e => setFormData({ ...formData, qualifications: e.target.value })}
                    placeholder="B.Tech in Computer Science, MBA"
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            </FormSection>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <SectionHeader
              title="Family & Personal Details"
              subtitle="Update emergency contact and family information"
            />

            <FormSection>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Father Information */}
                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Father Information</h4>
                </div>

                <div>
                  <Label>Father Status</Label>
                  <Select
                    value={formData.fatherStatus || undefined}
                    onValueChange={value => setFormData({ ...formData, fatherStatus: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alive">Alive</SelectItem>
                      <SelectItem value="Deceased">Deceased</SelectItem>
                      <SelectItem value="Separated/Not in contact">Separated/Not in contact</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.fatherStatus === 'Alive' && (
                  <>
                    <div>
                      <Label>Father Name</Label>
                      <Input
                        value={formData.fatherName || ''}
                        onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                        placeholder="Father's full name"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Father Occupation</Label>
                      <Input
                        value={formData.fatherOccupation || ''}
                        onChange={e => setFormData({ ...formData, fatherOccupation: e.target.value })}
                        placeholder="Occupation"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Father Contact</Label>
                      <Input
                        type="tel"
                        value={formData.fatherContact || ''}
                        onChange={e => setFormData({ ...formData, fatherContact: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {/* Mother Information */}
                <div className="md:col-span-2 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Mother Information</h4>
                </div>

                <div>
                  <Label>Mother Status</Label>
                  <Select
                    value={formData.motherStatus || undefined}
                    onValueChange={value => setFormData({ ...formData, motherStatus: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alive">Alive</SelectItem>
                      <SelectItem value="Deceased">Deceased</SelectItem>
                      <SelectItem value="Separated/Not in contact">Separated/Not in contact</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.motherStatus === 'Alive' && (
                  <>
                    <div>
                      <Label>Mother Name</Label>
                      <Input
                        value={formData.motherName || ''}
                        onChange={e => setFormData({ ...formData, motherName: e.target.value })}
                        placeholder="Mother's full name"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Mother Occupation</Label>
                      <Input
                        value={formData.motherOccupation || ''}
                        onChange={e => setFormData({ ...formData, motherOccupation: e.target.value })}
                        placeholder="Occupation"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Mother Contact</Label>
                      <Input
                        type="tel"
                        value={formData.motherContact || ''}
                        onChange={e => setFormData({ ...formData, motherContact: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <Label>Family Address</Label>
                  <Textarea
                    value={formData.familyAddress || ''}
                    onChange={e => setFormData({ ...formData, familyAddress: e.target.value })}
                    placeholder="Complete family address"
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input
                    value={formData.emergencyContactName || ''}
                    onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    placeholder="Contact person name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    type="tel"
                    value={formData.emergencyContactPhone || ''}
                    onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="mt-1"
                  />
                </div>
              </div>
            </FormSection>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <SectionHeader
              title="Application Details"
              subtitle="Update resume, source, and address"
            />

            <FormSection>
              <div className="space-y-4">
                {/* Resume Upload */}
                <div>
                  <Label>Resume (PDF, DOC, DOCX)</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <label
                      htmlFor="resume-upload-edit"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-medium">{candidate.resume ? 'Replace File' : 'Choose File'}</span>
                      <input
                        id="resume-upload-edit"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleResumeChange}
                      />
                    </label>
                    {resumeFile ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <FileText className="w-4 h-4" />
                        <span>New: {resumeFile.name}</span>
                        <button
                          onClick={() => setResumeFile(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : candidate.resume ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>Existing resume</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Source</Label>
                    <Select
                      value={formData.source || undefined}
                      onValueChange={value => setFormData({ ...formData, source: value as any })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
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

                  {formData.source === CANDIDATE_SOURCE.REFERRAL && (
                    <div>
                      <Label>
                        Referred By <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.referredBy || ''}
                        onChange={e => setFormData({ ...formData, referredBy: e.target.value })}
                        placeholder="Referrer name"
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status || candidate.status}
                      onValueChange={value => setFormData({ ...formData, status: value as any })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CANDIDATE_STATUS.NEW}>New</SelectItem>
                        <SelectItem value={CANDIDATE_STATUS.IN_PROCESS}>In Process</SelectItem>
                        <SelectItem value={CANDIDATE_STATUS.SELECTED}>Selected</SelectItem>
                        <SelectItem value={CANDIDATE_STATUS.REJECTED}>Rejected</SelectItem>
                        <SelectItem value={CANDIDATE_STATUS.ON_HOLD}>On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Current Address</Label>
                    <Textarea
                      value={formData.currentAddress || ''}
                      onChange={e => setFormData({ ...formData, currentAddress: e.target.value })}
                      placeholder="Current residential address"
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Permanent Address</Label>
                    <Textarea
                      value={formData.permanentAddress || ''}
                      onChange={e => setFormData({ ...formData, permanentAddress: e.target.value })}
                      placeholder="Permanent address"
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>City</Label>
                    <Select
                      value={formData.cityId ? String(formData.cityId) : undefined}
                      onValueChange={value => setFormData({ ...formData, cityId: parseInt(value) })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city.id} value={String(city.id)}>
                            {city.name}
                            {city.state && `, ${city.state.name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Postal Code</Label>
                    <Input
                      value={formData.postalCode || ''}
                      onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="110001"
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </FormSection>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Enhanced Header */}
        <DialogHeader className="pb-6 border-b border-gray-200 bg-gray-50 -m-6 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Edit Candidate: {candidate.firstName} {candidate.lastName}
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">Update candidate information</p>
            </div>
          </div>

          {/* Modern Step Indicator */}
          <div className="flex items-center gap-3 flex-1">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <button
                      type="button"
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all duration-200 ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-lg scale-110 cursor-default'
                          : isCompleted
                          ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105 cursor-pointer'
                          : 'bg-white text-gray-400 border-2 border-gray-200 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </button>
                    <span className={`text-xs font-medium ${
                      isCurrent ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 relative" style={{ top: '-16px' }}>
                      <div className={`h-full ${
                        currentStep > step.number ? 'bg-green-600' : 'bg-gray-200'
                      }`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious} disabled={isSubmitting}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid(currentStep) || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Candidate'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
