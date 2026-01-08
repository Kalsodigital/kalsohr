'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getEmployeeById, updateEmployee } from '@/lib/api/org/employees';
import { getAllDepartments } from '@/lib/api/org/departments';
import { getAllDesignations } from '@/lib/api/org/designations';
import { getAllBranches } from '@/lib/api/org/branches';
import { getAllEmploymentTypes } from '@/lib/api/org/employment-types';
import { getAllOrganizationalPositions } from '@/lib/api/org/organizational-positions';
import { getAllCountries, getAllStates, getAllCities } from '@/lib/api/org/locations';
import { getAllMaritalStatuses } from '@/lib/api/masters/marital-status';
import { getAllReligionsForOrg } from '@/lib/api/masters/religions';
import {
  Employee,
  UpdateEmployeeData,
  EMPLOYEE_STATUS,
  MARITAL_STATUS,
  BLOOD_GROUPS,
  EDUCATION_LEVELS,
  PARENT_STATUS,
} from '@/lib/types/employee';
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, User, Camera, Mail, Phone, Calendar, Briefcase, Home, Users, FileText, Building, DollarSign, MapPin, Heart, GraduationCap, UserCircle2, Upload, Pencil } from 'lucide-react';

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  employee: Employee | null;
  onSuccess: () => void;
}

interface SiblingData {
  id?: number;
  name: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  maritalStatus: string;
  contactNumber: string;
  isEmergencyContact: boolean;
  _delete?: boolean;
}

const STEPS = [
  { number: 1, title: 'Basic Information', icon: User },
  { number: 2, title: 'Employment Details', icon: Briefcase },
  { number: 3, title: 'Personal & Family', icon: Users },
  { number: 4, title: 'Documents & Banking', icon: FileText },
];

// Section header component for better visual organization
const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="pb-3 mb-6 border-b border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

// Form section wrapper for consistent styling
const FormSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-gradient-to-br from-gray-50/50 to-white p-6 rounded-lg border border-gray-100 ${className}`}>
    {children}
  </div>
);

export function EditEmployeeDialog({ open, onOpenChange, orgSlug, employee, onSuccess }: EditEmployeeDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState<UpdateEmployeeData>({});

  // Organizational position (not part of employee data, just for auto-filling dept & designation)
  const [selectedOrgPositionId, setSelectedOrgPositionId] = useState<number | undefined>(undefined);

  // Siblings
  const [siblings, setSiblings] = useState<SiblingData[]>([]);
  const [showAddSibling, setShowAddSibling] = useState(false);
  const [editingSiblingIndex, setEditingSiblingIndex] = useState<number | null>(null);
  const [newSibling, setNewSibling] = useState<SiblingData>({
    name: '',
    dateOfBirth: '',
    gender: '',
    occupation: '',
    maritalStatus: '',
    contactNumber: '',
    isEmergencyContact: false,
  });

  // File uploads
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofPreview, setIdProofPreview] = useState<string | null>(null);
  const [removeIdProof, setRemoveIdProof] = useState(false);

  // Master data
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [organizationalPositions, setOrganizationalPositions] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<any[]>([]);
  const [religions, setReligions] = useState<any[]>([]);
  const [genders] = useState([
    { id: 1, name: 'Male', code: 'M' },
    { id: 2, name: 'Female', code: 'F' },
    { id: 3, name: 'Other', code: 'O' },
  ]);

  // Load employee data when dialog opens
  useEffect(() => {
    if (open && employee) {
      loadEmployeeData();
      loadMasterData();
    }
  }, [open, employee, orgSlug]);

  // Load states/cities based on existing location
  useEffect(() => {
    if (formData.cityId && cities.length === 0) {
      loadLocationData();
    }
  }, [formData.cityId]);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdProofFile(file);
      setRemoveIdProof(false);
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setIdProofPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For PDFs, just set a placeholder
        setIdProofPreview('pdf');
      }
    }
  };

  const loadEmployeeData = async () => {
    if (!employee) return;

    try {
      setLoading(true);
      // Fetch full employee data with siblings
      const fullEmployee = await getEmployeeById(orgSlug, employee.id);

      // Set profile picture preview if exists (with full URL)
      if (fullEmployee.profilePicture) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const imageUrl = fullEmployee.profilePicture.startsWith('http')
          ? fullEmployee.profilePicture
          : `${baseUrl}${fullEmployee.profilePicture}`;
        setProfilePicturePreview(imageUrl);
      }

      // Load ID proof preview if exists
      if (fullEmployee.idProof) {
        // Use hardcoded backend URL since environment variable might not be available
        const API_URL = 'http://localhost:3000';
        console.log('🔍 ID Proof Loading:', {
          envApiUrl: process.env.NEXT_PUBLIC_API_URL,
          apiUrl: API_URL,
          idProofPath: fullEmployee.idProof,
        });
        const docUrl = fullEmployee.idProof.startsWith('http')
          ? fullEmployee.idProof
          : `${API_URL}${fullEmployee.idProof}`;
        console.log('✅ ID Proof URL constructed:', docUrl);
        setIdProofPreview(docUrl);
      }

      // Populate form data (convert null to undefined for type compatibility)
      setFormData({
        firstName: fullEmployee.firstName,
        lastName: fullEmployee.lastName ?? undefined,
        email: fullEmployee.email ?? undefined,
        phone: fullEmployee.phone ?? undefined,
        alternatePhone: fullEmployee.alternatePhone ?? undefined,
        dateOfBirth: fullEmployee.dateOfBirth ? fullEmployee.dateOfBirth.split('T')[0] : '',
        dateOfJoining: fullEmployee.dateOfJoining ? fullEmployee.dateOfJoining.split('T')[0] : '',
        dateOfLeaving: fullEmployee.dateOfLeaving ? fullEmployee.dateOfLeaving.split('T')[0] : '',
        departmentId: fullEmployee.departmentId ?? undefined,
        designationId: fullEmployee.designationId ?? undefined,
        branchId: fullEmployee.branchId ?? undefined,
        employmentTypeId: fullEmployee.employmentTypeId ?? undefined,
        salary: fullEmployee.salary ?? undefined,
        status: fullEmployee.status,
        isActive: fullEmployee.isActive,
        genderId: fullEmployee.genderId ?? undefined,
        maritalStatusId: fullEmployee.maritalStatusId ?? undefined,
        bloodGroup: (fullEmployee.bloodGroupMaster?.name || fullEmployee.bloodGroup) ?? undefined,
        religion: (fullEmployee.religionMaster?.name || fullEmployee.religion) ?? undefined,
        educationLevel: (fullEmployee.educationLevelMaster?.name || fullEmployee.educationLevel) ?? undefined,
        degrees: fullEmployee.degrees ?? undefined,
        currentAddress: fullEmployee.currentAddress ?? undefined,
        permanentAddress: fullEmployee.permanentAddress ?? undefined,
        cityId: fullEmployee.cityId ?? undefined,
        postalCode: fullEmployee.postalCode ?? undefined,
        fatherName: fullEmployee.fatherName ?? undefined,
        fatherOccupation: fullEmployee.fatherOccupation ?? undefined,
        fatherContact: fullEmployee.fatherContact ?? undefined,
        fatherStatus: fullEmployee.fatherStatus ?? undefined,
        motherName: fullEmployee.motherName ?? undefined,
        motherOccupation: fullEmployee.motherOccupation ?? undefined,
        motherContact: fullEmployee.motherContact ?? undefined,
        motherStatus: fullEmployee.motherStatus ?? undefined,
        emergencyContactName: fullEmployee.emergencyContactName ?? undefined,
        emergencyContactPhone: fullEmployee.emergencyContactPhone ?? undefined,
        familyAddress: fullEmployee.familyAddress ?? undefined,
        profilePicture: fullEmployee.profilePicture ?? undefined,
        aadharNumber: fullEmployee.aadharNumber ?? undefined,
        panNumber: fullEmployee.panNumber ?? undefined,
        idProof: fullEmployee.idProof ?? undefined,
        bankAccountNumber: fullEmployee.bankAccountNumber ?? undefined,
        bankIfscCode: fullEmployee.bankIfscCode ?? undefined,
        uanNumber: fullEmployee.uanNumber ?? undefined,
      });

      // Populate siblings
      if (fullEmployee.siblings && fullEmployee.siblings.length > 0) {
        setSiblings(
          fullEmployee.siblings.map((s) => ({
            id: s.id,
            name: s.name,
            dateOfBirth: s.dateOfBirth ? s.dateOfBirth.split('T')[0] : '',
            gender: s.gender || '',
            occupation: s.occupation || '',
            maritalStatus: s.maritalStatus || '',
            contactNumber: s.contact || '',
            isEmergencyContact: s.isEmergencyContact,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load employee data:', error);
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [depts, desigs, branchesList, empTypes, orgPositions, countriesList, citiesList, maritalStatusList, religionsList] = await Promise.all([
        getAllDepartments(orgSlug, true),
        getAllDesignations(orgSlug, true),
        getAllBranches(orgSlug, true),
        getAllEmploymentTypes(orgSlug, true),
        getAllOrganizationalPositions(orgSlug, { isActive: true }),
        getAllCountries(orgSlug, true),
        getAllCities(orgSlug, undefined, undefined, true), // Load all cities
        getAllMaritalStatuses(orgSlug, true),
        getAllReligionsForOrg(orgSlug, true),
      ]);

      setDepartments(depts);
      setDesignations(desigs);
      setBranches(branchesList);
      setEmploymentTypes(empTypes);
      setOrganizationalPositions(orgPositions);
      setCountries(countriesList);
      setCities(citiesList); // Set all cities
      setMaritalStatuses(maritalStatusList);
      setReligions(religionsList);
    } catch (error) {
      console.error('Failed to load master data:', error);
    }
  };

  const loadLocationData = async () => {
    if (!employee?.cityMaster) return;

    try {
      const countryId = employee.cityMaster.state.countryId;
      const stateId = employee.cityMaster.stateId;

      const [statesList, citiesList] = await Promise.all([
        getAllStates(orgSlug, countryId, true),
        getAllCities(orgSlug, stateId, undefined, true),
      ]);

      setStates(statesList);
      setCities(citiesList);
    } catch (error) {
      console.error('Failed to load location data:', error);
    }
  };

  const loadStates = async (countryId: number) => {
    try {
      const statesList = await getAllStates(orgSlug, countryId, true);
      setStates(statesList);
    } catch (error) {
      console.error('Failed to load states:', error);
    }
  };

  const loadCities = async (stateId: number) => {
    try {
      const citiesList = await getAllCities(orgSlug, stateId, undefined, true);
      setCities(citiesList);
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
  };

  const handleCountryChange = async (countryId: number) => {
    await loadStates(countryId);
    setCities([]);
    setFormData({ ...formData, cityId: undefined });
  };

  const handleStateChange = async (stateId: number) => {
    await loadCities(stateId);
    setFormData({ ...formData, cityId: undefined });
  };

  const handleOrganizationalPositionChange = (positionId: number) => {
    const selectedPosition = organizationalPositions.find(p => p.id === positionId);
    if (selectedPosition) {
      // Auto-populate department and designation from org position
      setSelectedOrgPositionId(positionId);
      setFormData({
        ...formData,
        departmentId: selectedPosition.departmentId,
        designationId: selectedPosition.designationId,
      });
    } else {
      // Clear org position
      setSelectedOrgPositionId(undefined);
    }
  };

  const addSibling = () => {
    if (!newSibling.name) {
      toast.error('Sibling name is required');
      return;
    }
    setSiblings([...siblings, newSibling]);
    setNewSibling({
      name: '',
      dateOfBirth: '',
      gender: '',
      occupation: '',
      maritalStatus: '',
      contactNumber: '',
      isEmergencyContact: false,
    });
    setShowAddSibling(false);
    toast.success('Sibling added');
  };

  const editSibling = (index: number) => {
    const sibling = siblings[index];
    setNewSibling({
      name: sibling.name,
      dateOfBirth: sibling.dateOfBirth,
      gender: sibling.gender,
      occupation: sibling.occupation,
      maritalStatus: sibling.maritalStatus,
      contactNumber: sibling.contactNumber,
      isEmergencyContact: sibling.isEmergencyContact,
    });
    setEditingSiblingIndex(index);
    setShowAddSibling(true);
  };

  const updateSibling = () => {
    if (!newSibling.name) {
      toast.error('Sibling name is required');
      return;
    }
    if (editingSiblingIndex === null) return;

    const updatedSiblings = [...siblings];
    updatedSiblings[editingSiblingIndex] = {
      ...updatedSiblings[editingSiblingIndex],
      ...newSibling,
    };
    setSiblings(updatedSiblings);
    setNewSibling({
      name: '',
      dateOfBirth: '',
      gender: '',
      occupation: '',
      maritalStatus: '',
      contactNumber: '',
      isEmergencyContact: false,
    });
    setEditingSiblingIndex(null);
    setShowAddSibling(false);
    toast.success('Sibling updated');
  };

  const cancelEditSibling = () => {
    setNewSibling({
      name: '',
      dateOfBirth: '',
      gender: '',
      occupation: '',
      maritalStatus: '',
      contactNumber: '',
      isEmergencyContact: false,
    });
    setEditingSiblingIndex(null);
    setShowAddSibling(false);
  };

  const removeSibling = (index: number) => {
    const sibling = siblings[index];
    if (sibling.id) {
      // Mark existing sibling for deletion
      setSiblings(siblings.map((s, i) => (i === index ? { ...s, _delete: true } : s)));
    } else {
      // Remove new sibling that hasn't been saved yet
      setSiblings(siblings.filter((_, i) => i !== index));
    }
    toast.success('Sibling removed');
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.firstName) {
          toast.error('First name is required');
          return false;
        }
        if (!formData.dateOfJoining) {
          toast.error('Date of joining is required');
          return false;
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          toast.error('Invalid email format');
          return false;
        }
        if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
          toast.error('Phone must be 10 digits');
          return false;
        }
        return true;
      case 2:
        return true;
      case 3:
        if (formData.dateOfBirth) {
          const age = new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear();
          if (age < 18) {
            toast.error('Employee must be at least 18 years old');
            return false;
          }
        }
        return true;
      case 4:
        if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
          toast.error('Aadhar must be 12 digits');
          return false;
        }
        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber)) {
          toast.error('Invalid PAN format (e.g., ABCDE1234F)');
          return false;
        }
        if (formData.bankIfscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankIfscCode)) {
          toast.error('Invalid IFSC code format');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep() || !employee) return;

    setIsSubmitting(true);
    try {
      const data: UpdateEmployeeData = {
        ...formData,
        siblings: siblings
          .filter((s) => !s._delete || s.id) // Include all siblings (for create/update/delete)
          .map((s) => ({
            id: s.id,
            name: s.name,
            dateOfBirth: s.dateOfBirth || undefined,
            gender: s.gender || undefined,
            occupation: s.occupation || undefined,
            maritalStatus: s.maritalStatus || undefined,
            contact: s.contactNumber || undefined, // Map contactNumber to contact for API
            isEmergencyContact: s.isEmergencyContact,
            _delete: s._delete,
          })),
      };

      // Handle ID proof removal
      if (removeIdProof) {
        data.idProof = undefined;
      }

      console.log('🔍 Frontend - Calling updateEmployee with:', {
        hasProfilePicture: !!profilePictureFile,
        profilePictureName: profilePictureFile?.name,
        hasIdProof: !!idProofFile,
        idProofName: idProofFile?.name,
        removeIdProof,
      });

      await updateEmployee(orgSlug, employee.id, data, profilePictureFile, idProofFile);

      toast.success('Employee updated successfully');

      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({});
    setSiblings([]);
    setShowAddSibling(false);
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setIdProofFile(null);
    setIdProofPreview(null);
    setRemoveIdProof(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  if (!employee) return null;

  const CurrentStepIcon = STEPS[currentStep - 1].icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Enhanced Header */}
        <DialogHeader className="pb-6 border-b border-gray-200 bg-gray-50 -m-6 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <CurrentStepIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Edit Employee
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1">Update employee information and details</p>
              </div>
            </div>
          </div>

          {/* Modern Step Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {STEPS.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(step.number)}
                        className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer ${
                          currentStep === step.number
                            ? 'bg-blue-600 text-white shadow-lg scale-110'
                            : currentStep > step.number
                            ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                            : 'bg-white text-gray-400 border-2 border-gray-200 hover:border-blue-300 hover:text-blue-500 hover:scale-105'
                        }`}
                      >
                        <StepIcon className="w-5 h-5" />
                      </button>
                      <span className={`text-xs font-medium ${
                        currentStep === step.number ? 'text-blue-600' : 'text-gray-500'
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
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading employee data...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we fetch the information</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-6 py-2">
            {/* Same 4 steps as create dialog - reusing the exact same UI structure */}
            {/* For brevity, I'll create a shared component structure */}

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Profile Picture & Personal Details Section */}
                <FormSection>
                  <SectionHeader title="Personal Details" subtitle="Basic information about the employee" />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Profile Picture */}
                    <div className="flex flex-col items-center justify-start gap-4">
                      <div className="relative group">
                        {profilePicturePreview ? (
                          <img
                            src={profilePicturePreview}
                            alt="Profile preview"
                            className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl ring-2 ring-blue-100"
                          />
                        ) : (
                          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-4 border-white shadow-xl">
                            <User className="w-20 h-20 text-white" />
                          </div>
                        )}
                        <label
                          htmlFor="profilePictureUpload"
                          className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 cursor-pointer shadow-lg transition-all hover:scale-110"
                        >
                          <Camera className="w-5 h-5" />
                          <input
                            id="profilePictureUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">Profile Picture</p>
                        {profilePictureFile && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1 justify-center">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            {profilePictureFile.name}
                          </p>
                        )}
                        {!profilePictureFile && (
                          <p className="text-xs text-gray-500 mt-1">Click camera icon to {profilePicturePreview ? 'change' : 'upload'}</p>
                        )}
                      </div>
                    </div>

                    {/* Right Column - Form Fields */}
                    <div className="lg:col-span-2 space-y-5">
                      {/* Name Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            First Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="firstName"
                            value={formData.firstName || ''}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            placeholder="Enter first name"
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            Last Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="lastName"
                            value={formData.lastName || ''}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            placeholder="Enter last name"
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Employee Code */}
                      <div className="space-y-2">
                        <Label htmlFor="employeeCode" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                          Employee Code
                        </Label>
                        <Input
                          id="employeeCode"
                          value={employee.employeeCode}
                          disabled
                          className="h-11 bg-gray-50 border-gray-200"
                        />
                        <p className="text-xs text-gray-500">Employee code cannot be changed</p>
                      </div>

                      {/* Contact Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-600" />
                            Email <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="employee@example.com"
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-blue-600" />
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            value={formData.phone || ''}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="10-digit phone number"
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Alternate Phone */}
                      <div className="space-y-2">
                        <Label htmlFor="alternatePhone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-blue-600" />
                          Alternate Phone
                        </Label>
                        <Input
                          id="alternatePhone"
                          value={formData.alternatePhone || ''}
                          onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                          placeholder="10-digit phone number"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      {/* Date Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            Date of Birth <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth || ''}
                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dateOfJoining" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            Date of Joining <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="dateOfJoining"
                            type="date"
                            value={formData.dateOfJoining || ''}
                            onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </FormSection>
              </div>
            )}

            {/* Step 2: Employment Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <FormSection>
                  <SectionHeader title="Employment Information" subtitle="Work-related details" />

                  <div className="space-y-5">
                    {/* Organizational Position - Optional */}
                    <div className="space-y-2">
                      <Label htmlFor="orgPosition" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <UserCircle2 className="w-4 h-4 text-purple-600" />
                        Organizational Position
                        <span className="text-xs text-gray-500 font-normal">(Optional - auto-fills dept & designation)</span>
                      </Label>
                      <Select
                        value={selectedOrgPositionId ? String(selectedOrgPositionId) : 'none'}
                        onValueChange={(value) => {
                          if (value && value !== 'none') {
                            handleOrganizationalPositionChange(parseInt(value));
                          } else {
                            setSelectedOrgPositionId(undefined);
                          }
                        }}
                      >
                        <SelectTrigger id="orgPosition" className="h-11 w-full border-gray-200 focus:border-purple-500 focus:ring-purple-500">
                          <SelectValue placeholder="Select organizational position (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- None (Manual Selection) --</SelectItem>
                          {organizationalPositions.map((pos) => (
                            <SelectItem key={pos.id} value={String(pos.id)}>
                              {pos.title} {pos.department && `(${pos.department.name})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="department" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Building className="w-4 h-4 text-blue-600" />
                          Department <span className="text-red-500">*</span>
                          {selectedOrgPositionId && (
                            <span className="text-xs text-purple-600">(From org position)</span>
                          )}
                        </Label>
                        <Select
                          value={formData.departmentId ? String(formData.departmentId) : ''}
                          onValueChange={(value) =>
                            setFormData({ ...formData, departmentId: parseInt(value) })
                          }
                          disabled={!!selectedOrgPositionId}
                        >
                          <SelectTrigger id="department" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={String(dept.id)}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="designation" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                          Designation <span className="text-red-500">*</span>
                          {selectedOrgPositionId && (
                            <span className="text-xs text-purple-600">(From org position)</span>
                          )}
                        </Label>
                        <Select
                          value={formData.designationId ? String(formData.designationId) : ''}
                          onValueChange={(value) =>
                            setFormData({ ...formData, designationId: parseInt(value) })
                          }
                          disabled={!!selectedOrgPositionId}
                        >
                          <SelectTrigger id="designation" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select designation" />
                          </SelectTrigger>
                          <SelectContent>
                            {designations.map((desig) => (
                              <SelectItem key={desig.id} value={String(desig.id)}>
                                {desig.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="branch" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          Branch <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.branchId ? String(formData.branchId) : ''}
                          onValueChange={(value) =>
                            setFormData({ ...formData, branchId: value ? parseInt(value) : undefined })
                          }
                        >
                          <SelectTrigger id="branch" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={String(branch.id)}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="employmentType" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                          Employment Type <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.employmentTypeId ? String(formData.employmentTypeId) : ''}
                          onValueChange={(value) =>
                            setFormData({ ...formData, employmentTypeId: parseInt(value) })
                          }
                        >
                          <SelectTrigger id="employmentType" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select employment type" />
                          </SelectTrigger>
                          <SelectContent>
                            {employmentTypes.map((type) => (
                              <SelectItem key={type.id} value={String(type.id)}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="salary" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          Salary (₹)
                        </Label>
                        <Input
                          id="salary"
                          type="number"
                          value={formData.salary || ''}
                          onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
                          placeholder="Enter salary"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <UserCircle2 className="w-4 h-4 text-blue-600" />
                          Status
                        </Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                          <SelectTrigger id="status" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EMPLOYEE_STATUS.ACTIVE}>Active</SelectItem>
                            <SelectItem value={EMPLOYEE_STATUS.ON_LEAVE}>On Leave</SelectItem>
                            <SelectItem value={EMPLOYEE_STATUS.TERMINATED}>Terminated</SelectItem>
                            <SelectItem value={EMPLOYEE_STATUS.RESIGNED}>Resigned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(formData.status === EMPLOYEE_STATUS.TERMINATED || formData.status === EMPLOYEE_STATUS.RESIGNED) && (
                      <div className="space-y-2">
                        <Label htmlFor="dateOfLeaving" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          Date of Leaving
                        </Label>
                        <Input
                          id="dateOfLeaving"
                          type="date"
                          value={formData.dateOfLeaving || ''}
                          onChange={(e) => setFormData({ ...formData, dateOfLeaving: e.target.value })}
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </FormSection>
              </div>
            )}

            {/* Step 3: Personal & Family */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Personal Information */}
                <FormSection>
                  <SectionHeader title="Personal Information" subtitle="Additional personal details" />

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="gender" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <UserCircle2 className="w-4 h-4 text-blue-600" />
                          Gender
                        </Label>
                        <Select
                          value={formData.genderId ? String(formData.genderId) : ''}
                          onValueChange={(value) => setFormData({ ...formData, genderId: parseInt(value) })}
                        >
                          <SelectTrigger id="gender" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            {genders.map((gender) => (
                              <SelectItem key={gender.id} value={String(gender.id)}>
                                {gender.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maritalStatus" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-blue-600" />
                          Marital Status
                        </Label>
                        <Select
                          value={formData.maritalStatusId ? String(formData.maritalStatusId) : ''}
                          onValueChange={(value) => setFormData({ ...formData, maritalStatusId: parseInt(value) })}
                        >
                          <SelectTrigger id="maritalStatus" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select marital status" />
                          </SelectTrigger>
                          <SelectContent>
                            {maritalStatuses.map((status) => (
                              <SelectItem key={status.id} value={String(status.id)}>
                                {status.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bloodGroup" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-blue-600" />
                          Blood Group
                        </Label>
                        <Select
                          value={formData.bloodGroup || ''}
                          onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
                        >
                          <SelectTrigger id="bloodGroup" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOOD_GROUPS.map((group) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="religion" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          Religion
                        </Label>
                        <Select
                          value={formData.religion ? String(formData.religion) : ''}
                          onValueChange={(value) => setFormData({ ...formData, religion: value })}
                        >
                          <SelectTrigger id="religion" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select religion" />
                          </SelectTrigger>
                          <SelectContent>
                            {religions.map((religion) => (
                              <SelectItem key={religion.id} value={religion.name}>
                                {religion.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="educationLevel" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                          Education Level
                        </Label>
                        <Select
                          value={formData.educationLevel || ''}
                          onValueChange={(value) => setFormData({ ...formData, educationLevel: value })}
                        >
                          <SelectTrigger id="educationLevel" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select education level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EDUCATION_LEVELS.HIGH_SCHOOL}>High School</SelectItem>
                            <SelectItem value={EDUCATION_LEVELS.DIPLOMA}>Diploma</SelectItem>
                            <SelectItem value={EDUCATION_LEVELS.BACHELORS}>Bachelor's Degree</SelectItem>
                            <SelectItem value={EDUCATION_LEVELS.MASTERS}>Master's Degree</SelectItem>
                            <SelectItem value={EDUCATION_LEVELS.DOCTORATE}>Doctorate</SelectItem>
                            <SelectItem value={EDUCATION_LEVELS.OTHER}>Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="degrees" className="text-sm font-medium">
                        Degrees/Certifications
                      </Label>
                      <Textarea
                        id="degrees"
                        value={formData.degrees || ''}
                        onChange={(e) => setFormData({ ...formData, degrees: e.target.value })}
                        placeholder="List degrees and certifications..."
                        className="min-h-20"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentAddress" className="text-sm font-medium">
                          Current Address <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="currentAddress"
                          value={formData.currentAddress || ''}
                          onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                          placeholder="Enter current address"
                          className="min-h-20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="permanentAddress" className="text-sm font-medium">
                          Permanent Address
                        </Label>
                        <Textarea
                          id="permanentAddress"
                          value={formData.permanentAddress || ''}
                          onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                          placeholder="Enter permanent address"
                          className="min-h-20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-medium">
                          City <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.cityId ? String(formData.cityId) : ''}
                          onValueChange={async (value) => {
                            const cityId = parseInt(value);
                            setFormData({ ...formData, cityId });
                            // Auto-fill state and country based on city
                            const selectedCity = cities.find((c) => c.id === cityId);
                            if (selectedCity && selectedCity.state) {
                              await loadStates(selectedCity.state.countryId);
                            }
                          }}
                        >
                          <SelectTrigger id="city" className="h-10 w-full">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city.id} value={String(city.id)}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-medium">
                          State <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={
                            formData.cityId
                              ? String(cities.find((c) => c.id === formData.cityId)?.state?.id || '')
                              : ''
                          }
                          onValueChange={(value) => handleStateChange(parseInt(value))}
                          disabled={true}
                        >
                          <SelectTrigger id="state" className="h-10 w-full bg-gray-50">
                            <SelectValue placeholder="Auto-filled from city" />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem key={state.id} value={String(state.id)}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-sm font-medium">
                          Country <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={
                            formData.cityId
                              ? String(cities.find((c) => c.id === formData.cityId)?.state?.country?.id || '')
                              : ''
                          }
                          onValueChange={(value) => handleCountryChange(parseInt(value))}
                          disabled={true}
                        >
                          <SelectTrigger id="country" className="h-10 w-full bg-gray-50">
                            <SelectValue placeholder="Auto-filled from city" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.id} value={String(country.id)}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode" className="text-sm font-medium">
                          Postal Code
                        </Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode || ''}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          placeholder="Enter postal code"
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                </FormSection>

                {/* Family Information */}
                <FormSection>
                  <SectionHeader title="Family Information" subtitle="Parent and emergency contact details" />
                  <div className="space-y-5">
                    {/* Father Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="fatherName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          Father's Name
                        </Label>
                        <Input
                          id="fatherName"
                          value={formData.fatherName || ''}
                          onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                          placeholder="Enter father's name"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fatherOccupation" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                          Father's Occupation
                        </Label>
                        <Input
                          id="fatherOccupation"
                          value={formData.fatherOccupation || ''}
                          onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                          placeholder="Enter occupation"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="fatherContact" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-blue-600" />
                          Father's Contact
                        </Label>
                        <Input
                          id="fatherContact"
                          value={formData.fatherContact || ''}
                          onChange={(e) => setFormData({ ...formData, fatherContact: e.target.value })}
                          placeholder="10-digit phone number"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fatherStatus" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-blue-600" />
                          Father's Status
                        </Label>
                        <Select
                          value={formData.fatherStatus || ''}
                          onValueChange={(value) => setFormData({ ...formData, fatherStatus: value })}
                        >
                          <SelectTrigger id="fatherStatus" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PARENT_STATUS.ALIVE}>Alive</SelectItem>
                            <SelectItem value={PARENT_STATUS.DECEASED}>Deceased</SelectItem>
                            <SelectItem value={PARENT_STATUS.UNKNOWN}>Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Mother Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="motherName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          Mother's Name
                        </Label>
                        <Input
                          id="motherName"
                          value={formData.motherName || ''}
                          onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                          placeholder="Enter mother's name"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="motherOccupation" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                          Mother's Occupation
                        </Label>
                        <Input
                          id="motherOccupation"
                          value={formData.motherOccupation || ''}
                          onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                          placeholder="Enter occupation"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="motherContact" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-blue-600" />
                          Mother's Contact
                        </Label>
                        <Input
                          id="motherContact"
                          value={formData.motherContact || ''}
                          onChange={(e) => setFormData({ ...formData, motherContact: e.target.value })}
                          placeholder="10-digit phone number"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="motherStatus" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-blue-600" />
                          Mother's Status
                        </Label>
                        <Select
                          value={formData.motherStatus || ''}
                          onValueChange={(value) => setFormData({ ...formData, motherStatus: value })}
                        >
                          <SelectTrigger id="motherStatus" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PARENT_STATUS.ALIVE}>Alive</SelectItem>
                            <SelectItem value={PARENT_STATUS.DECEASED}>Deceased</SelectItem>
                            <SelectItem value={PARENT_STATUS.UNKNOWN}>Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="emergencyContactName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          Emergency Contact Name
                        </Label>
                        <Input
                          id="emergencyContactName"
                          value={formData.emergencyContactName || ''}
                          onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                          placeholder="Enter contact name"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emergencyContactPhone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-blue-600" />
                          Emergency Contact Number
                        </Label>
                        <Input
                          id="emergencyContactPhone"
                          value={formData.emergencyContactPhone || ''}
                          onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                          placeholder="10-digit phone number"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="familyAddress" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Home className="w-4 h-4 text-blue-600" />
                        Family Address
                      </Label>
                      <Textarea
                        id="familyAddress"
                        value={formData.familyAddress || ''}
                        onChange={(e) => setFormData({ ...formData, familyAddress: e.target.value })}
                        placeholder="Enter family address"
                        className="min-h-24 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </FormSection>

                {/* Siblings */}
                <FormSection>
                  <div className="flex items-center justify-between mb-6">
                    <SectionHeader title="Siblings" subtitle="Add or manage siblings information" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddSibling(true)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Sibling
                    </Button>
                  </div>

                  {siblings.filter((s) => !s._delete).length > 0 && (
                    <div className="space-y-3 mb-4">
                      {siblings
                        .filter((s) => !s._delete)
                        .map((sibling, index) => (
                          <div
                            key={sibling.id || index}
                            className="p-4 border border-gray-200 rounded-lg flex items-start justify-between"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{sibling.name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {sibling.gender && `${sibling.gender} • `}
                                {sibling.occupation && `${sibling.occupation} • `}
                                {sibling.contactNumber}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => editSibling(siblings.indexOf(sibling))}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSibling(siblings.indexOf(sibling))}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {showAddSibling && (
                    <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">
                          {editingSiblingIndex !== null ? 'Edit Sibling' : 'Add New Sibling'}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditSibling}
                        >
                          Cancel
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="siblingName" className="text-sm font-medium">
                            Name
                          </Label>
                          <Input
                            id="siblingName"
                            value={newSibling.name}
                            onChange={(e) => setNewSibling({ ...newSibling, name: e.target.value })}
                            placeholder="Enter sibling name"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="siblingDob" className="text-sm font-medium">
                            Date of Birth
                          </Label>
                          <Input
                            id="siblingDob"
                            type="date"
                            value={newSibling.dateOfBirth}
                            onChange={(e) => setNewSibling({ ...newSibling, dateOfBirth: e.target.value })}
                            className="h-10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="siblingGender" className="text-sm font-medium">
                            Gender
                          </Label>
                          <Select
                            value={newSibling.gender}
                            onValueChange={(value) => setNewSibling({ ...newSibling, gender: value })}
                          >
                            <SelectTrigger id="siblingGender" className="h-10 w-full">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="siblingOccupation" className="text-sm font-medium">
                            Occupation
                          </Label>
                          <Input
                            id="siblingOccupation"
                            value={newSibling.occupation}
                            onChange={(e) => setNewSibling({ ...newSibling, occupation: e.target.value })}
                            placeholder="Enter occupation"
                            className="h-10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="siblingContact" className="text-sm font-medium">
                            Contact Number
                          </Label>
                          <Input
                            id="siblingContact"
                            value={newSibling.contactNumber}
                            onChange={(e) => setNewSibling({ ...newSibling, contactNumber: e.target.value })}
                            placeholder="10-digit phone number"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="siblingMarital" className="text-sm font-medium">
                            Marital Status
                          </Label>
                          <Select
                            value={newSibling.maritalStatus}
                            onValueChange={(value) => setNewSibling({ ...newSibling, maritalStatus: value })}
                          >
                            <SelectTrigger id="siblingMarital" className="h-10 w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={MARITAL_STATUS.SINGLE}>Single</SelectItem>
                              <SelectItem value={MARITAL_STATUS.MARRIED}>Married</SelectItem>
                              <SelectItem value={MARITAL_STATUS.DIVORCED}>Divorced</SelectItem>
                              <SelectItem value={MARITAL_STATUS.WIDOWED}>Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={editingSiblingIndex !== null ? updateSibling : addSibling}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        {editingSiblingIndex !== null ? (
                          <>
                            <Pencil className="w-4 h-4 mr-2" />
                            Update Sibling
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Sibling
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </FormSection>
              </div>
            )}

            {/* Step 4: Documents & Banking */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Documents */}
                <FormSection>
                  <SectionHeader title="Documents" subtitle="Identity and proof documents" />
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="profilePicture" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-600" />
                        Profile Picture URL
                      </Label>
                      <Input
                        id="profilePicture"
                        value={formData.profilePicture || ''}
                        onChange={(e) => setFormData({ ...formData, profilePicture: e.target.value })}
                        placeholder="Enter profile picture URL"
                        className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                        Phase 1: Enter URL. File upload coming in Phase 2
                      </p>
                    </div>

                    {/* ID Proof Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="idProof" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        ID Proof Document
                      </Label>

                      {/* Show existing ID proof if present */}
                      {idProofPreview && !removeIdProof && (
                        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {idProofPreview === 'pdf' || idProofPreview.includes('.pdf') ? (
                              <FileText className="w-8 h-8 text-red-600" />
                            ) : (
                              <img src={idProofPreview} alt="ID Proof" className="w-16 h-16 object-cover rounded" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">Current ID Proof</p>
                              <p className="text-xs text-gray-600">
                                {idProofPreview === 'pdf' || idProofPreview.includes('.pdf') ? 'PDF Document' : 'Image Document'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(idProofPreview, '_blank')}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRemoveIdProof(true);
                                setIdProofPreview(null);
                                setIdProofFile(null);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Upload new ID proof */}
                      {(!idProofPreview || removeIdProof) && (
                        <div>
                          <Input
                            id="idProof"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleIdProofChange}
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Accepted formats: PDF, JPG, JPEG, PNG (Max 10MB)
                          </p>
                        </div>
                      )}

                      {/* Replace existing document */}
                      {idProofPreview && !removeIdProof && (
                        <div>
                          <Input
                            id="idProofReplace"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleIdProofChange}
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Upload a new file to replace the existing document
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="aadhar" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          Aadhar Number
                        </Label>
                        <Input
                          id="aadhar"
                          value={formData.aadharNumber || ''}
                          onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
                          placeholder="12-digit Aadhar number"
                          maxLength={12}
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pan" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          PAN Number
                        </Label>
                        <Input
                          id="pan"
                          value={formData.panNumber || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })
                          }
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="idProof" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-blue-600" />
                        ID Proof URL
                      </Label>
                      <Input
                        id="idProof"
                        value={formData.idProof || ''}
                        onChange={(e) => setFormData({ ...formData, idProof: e.target.value })}
                        placeholder="Enter ID proof document URL"
                        className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </FormSection>

                {/* Banking Information */}
                <FormSection>
                  <SectionHeader title="Banking Information" subtitle="Bank account and payroll details" />
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Building className="w-4 h-4 text-blue-600" />
                          Bank Account Number
                        </Label>
                        <Input
                          id="bankAccount"
                          value={formData.bankAccountNumber || ''}
                          onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                          placeholder="Enter account number"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ifsc" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Building className="w-4 h-4 text-blue-600" />
                          Bank IFSC Code
                        </Label>
                        <Input
                          id="ifsc"
                          value={formData.bankIfscCode || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })
                          }
                          placeholder="ABCD0123456"
                          maxLength={11}
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="uan" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        UAN Number
                      </Label>
                      <Input
                        id="uan"
                        value={formData.uanNumber || ''}
                        onChange={(e) => setFormData({ ...formData, uanNumber: e.target.value })}
                        placeholder="Enter UAN number"
                        className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </FormSection>

                {/* Review Summary */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg mt-0.5">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 text-lg">Ready to Update Employee</h4>
                      <p className="text-sm text-gray-600">
                        Review the information across all steps and click "Update Employee" to save changes for{' '}
                        <strong className="text-blue-700">{formData.firstName} {formData.lastName}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Enhanced Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 bg-gray-50 -m-6 p-6 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isSubmitting}
            className="px-6 border-gray-300 hover:bg-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            {currentStep < STEPS.length && (
              <Button
                type="button"
                variant="default"
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Employee'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
