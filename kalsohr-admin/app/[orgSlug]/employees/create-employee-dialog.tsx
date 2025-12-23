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
import { createEmployee, getAllEmployees } from '@/lib/api/org/employees';
import { getAllDepartments } from '@/lib/api/org/departments';
import { getAllDesignations } from '@/lib/api/org/designations';
import { getAllBranches } from '@/lib/api/org/branches';
import { getAllEmploymentTypes } from '@/lib/api/org/employment-types';
import { getAllOrganizationalPositions } from '@/lib/api/org/organizational-positions';
import { getAllCountries, getAllStates, getAllCities } from '@/lib/api/org/locations';
import { getAllMaritalStatuses } from '@/lib/api/masters/marital-status';
import { getAllReligionsForOrg } from '@/lib/api/masters/religions';
import {
  CreateEmployeeData,
  EMPLOYEE_STATUS,
  MARITAL_STATUS,
  BLOOD_GROUPS,
  EDUCATION_LEVELS,
  PARENT_STATUS,
} from '@/lib/types/employee';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Wand2, Upload, User, Camera, Mail, Phone, Calendar, Briefcase, Home, Users, FileText, Building, DollarSign, MapPin, Heart, GraduationCap, UserCircle2 } from 'lucide-react';

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  onSuccess: () => void;
}

interface SiblingData {
  name: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  maritalStatus: string;
  contact: string;
  isEmergencyContact: boolean;
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

export function CreateEmployeeDialog({ open, onOpenChange, orgSlug, onSuccess }: CreateEmployeeDialogProps) {
  const { organization } = useOrgPermissions();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState<CreateEmployeeData>({
    firstName: '',
    employeeCode: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    status: EMPLOYEE_STATUS.ACTIVE,
    isActive: true,
  });

  // Siblings
  const [siblings, setSiblings] = useState<SiblingData[]>([]);
  const [showAddSibling, setShowAddSibling] = useState(false);
  const [newSibling, setNewSibling] = useState<SiblingData>({
    name: '',
    dateOfBirth: '',
    gender: '',
    occupation: '',
    maritalStatus: '',
    contact: '',
    isEmergencyContact: false,
  });

  // File uploads
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);

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

  // Load master data
  useEffect(() => {
    if (open) {
      loadMasterData();
    }
  }, [open, orgSlug]);

  // Load states when country changes
  useEffect(() => {
    if (formData.cityId) {
      // Get the selected city's state to load other cities in that state
      const city = cities.find((c) => c.id === formData.cityId);
      if (city) {
        loadStates(city.state.countryId);
        loadCities(city.stateId);
      }
    }
  }, [formData.cityId]);

  const loadMasterData = async () => {
    try {
      setLoading(true);
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
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
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
      setFormData({
        ...formData,
        organizationalPositionId: positionId,
        departmentId: selectedPosition.departmentId,
        designationId: selectedPosition.designationId,
      });
    } else {
      // Clear org position
      setFormData({
        ...formData,
        organizationalPositionId: undefined,
      });
    }
  };

  const generateEmployeeCode = async () => {
    try {
      // Generate prefix from organization name initials
      // e.g., "Bawa Medical Mart" -> "BMM"
      const orgName = organization?.name || 'ORG';
      const prefix = orgName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('');

      // Fetch all employees to get the last employee code
      const employeesData = await getAllEmployees(orgSlug, { page: 1, limit: 1 });
      const employees = employeesData.employees || [];

      // Find the highest sequence number from existing employee codes with this prefix
      let nextSequence = 1;

      if (employees.length > 0) {
        // Get all employee codes that match the prefix pattern
        const allEmployeesData = await getAllEmployees(orgSlug, { page: 1, limit: 1000 });
        const allEmployees = allEmployeesData.employees || [];

        const matchingCodes = allEmployees
          .filter(emp => emp.employeeCode?.startsWith(prefix + '-'))
          .map(emp => {
            const parts = emp.employeeCode?.split('-');
            const numPart = parts?.[parts.length - 1];
            return parseInt(numPart || '0');
          })
          .filter(num => !isNaN(num));

        if (matchingCodes.length > 0) {
          nextSequence = Math.max(...matchingCodes) + 1;
        }
      }

      // Format: PREFIX-####
      const code = `${prefix}-${String(nextSequence).padStart(4, '0')}`;
      setFormData({ ...formData, employeeCode: code });
      toast.success(`Generated employee code: ${code}`);
    } catch (error) {
      console.error('Failed to generate employee code:', error);
      toast.error('Failed to generate employee code');
    }
  };

  const fillDummyData = async () => {
    try {
      const randomNum = Math.floor(Math.random() * 1000);

      // Generate employee code inline
      const orgName = organization?.name || 'ORG';
      const prefix = orgName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('');

      const employeesData = await getAllEmployees(orgSlug, { page: 1, limit: 1000 });
      const allEmployees = employeesData.employees || [];

      const matchingCodes = allEmployees
        .filter(emp => emp.employeeCode?.startsWith(prefix + '-'))
        .map(emp => {
          const parts = emp.employeeCode?.split('-');
          const numPart = parts?.[parts.length - 1];
          return parseInt(numPart || '0');
        })
        .filter(num => !isNaN(num));

      const nextSequence = matchingCodes.length > 0 ? Math.max(...matchingCodes) + 1 : 1;
      const generatedCode = `${prefix}-${String(nextSequence).padStart(4, '0')}`;

      // Set all form data in one update
      setFormData({
        ...formData,
        firstName: 'John',
        lastName: 'Doe',
        employeeCode: generatedCode,
        email: `john.doe${randomNum}@example.com`,
        phone: `98765${String(randomNum).padStart(5, '0')}`,
        alternatePhone: `87654${String(randomNum).padStart(5, '0')}`,
        dateOfBirth: '1990-01-15',
        dateOfJoining: new Date().toISOString().split('T')[0],

        // Step 2: Employment Details (use first available options)
        departmentId: departments[0]?.id,
        designationId: designations[0]?.id,
        branchId: branches[0]?.id,
        employmentTypeId: employmentTypes[0]?.id,
        salary: 50000,
        status: EMPLOYEE_STATUS.ACTIVE,

        // Step 3: Personal & Family
        genderId: genders[0]?.id,
        maritalStatusId: maritalStatuses[0]?.id,
        bloodGroup: BLOOD_GROUPS[0],
        religion: 'Christianity',
        educationLevel: EDUCATION_LEVELS.BACHELORS,
        degrees: 'B.Tech Computer Science',
        currentAddress: `${randomNum} Test Street, Test City`,
        permanentAddress: `${randomNum} Test Street, Test City`,
        cityId: cities[0]?.id,
        postalCode: `${String(randomNum).padStart(6, '0')}`,
        fatherName: 'James Doe',
        fatherOccupation: 'Business',
        fatherContact: '9876543210',
        fatherStatus: PARENT_STATUS.ALIVE,
        motherName: 'Mary Doe',
        motherOccupation: 'Teacher',
        motherContact: '9876543211',
        motherStatus: PARENT_STATUS.ALIVE,
        familyAddress: `${randomNum} Family Street`,
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '9876543212',

        // Step 4: Documents & Banking
        aadharNumber: `${String(randomNum).padStart(12, '0')}`,
        panNumber: `ABCDE${String(randomNum).padStart(4, '0')}F`,
        bankAccountNumber: `${String(randomNum).padStart(12, '0')}`,
        bankIfscCode: 'SBIN0001234',
        uanNumber: `${String(randomNum).padStart(12, '0')}`,

        isActive: true,
      });

      // Reset file uploads
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      setIdProofFile(null);

      toast.success(`Auto-filled with dummy data! Employee code: ${generatedCode}`);
    } catch (error) {
      console.error('Failed to fill dummy data:', error);
      toast.error('Failed to auto-fill data');
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.success(`Selected: ${file.name}`);
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
      contact: '',
      isEmergencyContact: false,
    });
    setShowAddSibling(false);
    toast.success('Sibling added');
  };

  const removeSibling = (index: number) => {
    setSiblings(siblings.filter((_, i) => i !== index));
    toast.success('Sibling removed');
  };

  // Check if current step is valid (without showing errors)
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        // Required fields: First Name, Last Name, Employee Code, Email, Date of Birth, Date of Joining
        if (!formData.firstName || !formData.lastName || !formData.employeeCode || !formData.email || !formData.dateOfBirth || !formData.dateOfJoining) {
          return false;
        }
        // Email format validation
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          return false;
        }
        // Phone validation if provided
        if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
          return false;
        }
        // Age validation
        if (formData.dateOfBirth) {
          const age = new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear();
          if (age < 18) {
            return false;
          }
        }
        return true;
      case 2:
        // Required fields: Department, Designation, Branch, Employment Type
        if (!formData.departmentId || !formData.designationId || !formData.branchId || !formData.employmentTypeId) {
          return false;
        }
        return true;
      case 3:
        // Required fields: Current Address, City, State, Country
        if (!formData.currentAddress || !formData.cityId) {
          return false;
        }
        return true;
      case 4:
        // No required fields, just validate formats if provided
        if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
          return false;
        }
        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber)) {
          return false;
        }
        if (formData.bankIfscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankIfscCode)) {
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.firstName) {
          toast.error('First name is required');
          return false;
        }
        if (!formData.lastName) {
          toast.error('Last name is required');
          return false;
        }
        if (!formData.employeeCode) {
          toast.error('Employee code is required');
          return false;
        }
        if (!formData.email) {
          toast.error('Email is required');
          return false;
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          toast.error('Invalid email format');
          return false;
        }
        if (!formData.dateOfBirth) {
          toast.error('Date of birth is required');
          return false;
        }
        if (formData.dateOfBirth) {
          const age = new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear();
          if (age < 18) {
            toast.error('Employee must be at least 18 years old');
            return false;
          }
        }
        if (!formData.dateOfJoining) {
          toast.error('Date of joining is required');
          return false;
        }
        if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
          toast.error('Phone must be 10 digits');
          return false;
        }
        return true;
      case 2:
        if (!formData.departmentId) {
          toast.error('Department is required');
          return false;
        }
        if (!formData.designationId) {
          toast.error('Designation is required');
          return false;
        }
        if (!formData.branchId) {
          toast.error('Branch is required');
          return false;
        }
        if (!formData.employmentTypeId) {
          toast.error('Employment type is required');
          return false;
        }
        return true;
      case 3:
        if (!formData.currentAddress) {
          toast.error('Current address is required');
          return false;
        }
        if (!formData.cityId) {
          toast.error('City is required');
          return false;
        }
        return true;
      case 4:
        // Documents & Banking - validate formats if provided
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
    if (!validateStep()) return;

    setIsSubmitting(true);
    try {
      const data: CreateEmployeeData = {
        ...formData,
        siblings: siblings.length > 0 ? siblings : undefined,
      };

      await createEmployee(orgSlug, data, profilePictureFile, idProofFile);
      toast.success('Employee created successfully');
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      firstName: '',
      employeeCode: '',
      dateOfJoining: new Date().toISOString().split('T')[0],
      status: EMPLOYEE_STATUS.ACTIVE,
      isActive: true,
    });
    setSiblings([]);
    setShowAddSibling(false);
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setIdProofFile(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

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
                  Add New Employee
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1">Fill in the details to create a new employee record</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillDummyData}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-white hover:bg-gray-50"
            >
              <Wand2 className="w-4 h-4" />
              Auto Fill
            </Button>
          </div>

          {/* Modern Step Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.number;
                const isCurrent = currentStep === step.number;
                const canNavigate = isCompleted || isCurrent;

                const handleStepClick = () => {
                  if (step.number < currentStep) {
                    // Allow going back to previous steps
                    setCurrentStep(step.number);
                  } else if (step.number > currentStep) {
                    // Validate current step before moving forward
                    if (validateStep()) {
                      setCurrentStep(step.number);
                    }
                  }
                };

                return (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={handleStepClick}
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
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading form data...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we prepare everything</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
            <div className="space-y-6 py-2">
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
                            <p className="text-xs text-gray-500 mt-1">Click camera icon to upload</p>
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
                              value={formData.firstName}
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
                            Employee Code <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="employeeCode"
                              value={formData.employeeCode}
                              onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                              placeholder="Enter employee code"
                              className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generateEmployeeCode}
                              className="h-11 whitespace-nowrap px-6 border-gray-200 hover:border-blue-500 hover:text-blue-600"
                            >
                              Generate
                            </Button>
                          </div>
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
                          value={formData.organizationalPositionId ? String(formData.organizationalPositionId) : 'none'}
                          onValueChange={(value) => {
                            if (value && value !== 'none') {
                              handleOrganizationalPositionChange(parseInt(value));
                            } else {
                              setFormData({ ...formData, organizationalPositionId: undefined });
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
                            {formData.organizationalPositionId && (
                              <span className="text-xs text-purple-600">(From org position)</span>
                            )}
                          </Label>
                          <Select
                            value={formData.departmentId ? String(formData.departmentId) : ''}
                            onValueChange={(value) =>
                              setFormData({ ...formData, departmentId: parseInt(value) })
                            }
                            disabled={!!formData.organizationalPositionId}
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
                            {formData.organizationalPositionId && (
                              <span className="text-xs text-purple-600">(From org position)</span>
                            )}
                          </Label>
                          <Select
                            value={formData.designationId ? String(formData.designationId) : ''}
                            onValueChange={(value) =>
                              setFormData({ ...formData, designationId: parseInt(value) })
                            }
                            disabled={!!formData.organizationalPositionId}
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
                            onValueChange={(value) => setFormData({ ...formData, branchId: parseInt(value) })}
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
                        <Label htmlFor="degrees" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                          Degrees/Certifications
                        </Label>
                        <Textarea
                          id="degrees"
                          value={formData.degrees || ''}
                          onChange={(e) => setFormData({ ...formData, degrees: e.target.value })}
                          placeholder="List degrees and certifications..."
                          className="min-h-24 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </FormSection>

                  {/* Address Information */}
                  <FormSection>
                    <SectionHeader title="Address Information" subtitle="Current and permanent addresses" />

                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="currentAddress" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Home className="w-4 h-4 text-blue-600" />
                            Current Address <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            id="currentAddress"
                            value={formData.currentAddress || ''}
                            onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                            placeholder="Enter current address"
                            className="min-h-24 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="permanentAddress" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Home className="w-4 h-4 text-blue-600" />
                            Permanent Address
                          </Label>
                          <Textarea
                            id="permanentAddress"
                            value={formData.permanentAddress || ''}
                            onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                            placeholder="Enter permanent address"
                            className="min-h-24 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
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
                            <SelectTrigger id="city" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
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
                          <Label htmlFor="state" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
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
                            <SelectTrigger id="state" className="h-11 w-full bg-gray-50 border-gray-200">
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
                          <Label htmlFor="country" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
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
                            <SelectTrigger id="country" className="h-11 w-full bg-gray-50 border-gray-200">
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

                      <div className="space-y-2">
                        <Label htmlFor="postalCode" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          Postal Code
                        </Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode || ''}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          placeholder="Enter postal code"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </FormSection>

                  {/* Family Information */}
                  <FormSection>
                    <SectionHeader title="Family Information" subtitle="Details about family members" />

                    <div className="space-y-5">
                      {/* Father Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="fatherName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
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
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fatherStatus" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <UserCircle2 className="w-4 h-4 text-blue-600" />
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

                      {/* Mother Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="motherName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
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
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="motherStatus" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <UserCircle2 className="w-4 h-4 text-blue-600" />
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

                      {/* Emergency Contact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-blue-600" />
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
                      <SectionHeader title="Siblings" subtitle="Add sibling information if applicable" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddSibling(true)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Sibling
                      </Button>
                    </div>

                    {siblings.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {siblings.map((sibling, index) => (
                          <div
                            key={index}
                            className="p-4 border border-gray-200 rounded-lg flex items-start justify-between bg-white hover:shadow-sm transition-shadow"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{sibling.name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {sibling.gender && `${sibling.gender} • `}
                                {sibling.occupation && `${sibling.occupation} • `}
                                {sibling.contact}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSibling(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showAddSibling && (
                      <div className="p-6 border-2 border-blue-200 bg-blue-50/50 rounded-lg space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">Add New Sibling</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddSibling(false)}
                          >
                            Cancel
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label htmlFor="siblingName" className="text-sm font-semibold text-gray-700">
                              Name
                            </Label>
                            <Input
                              id="siblingName"
                              value={newSibling.name}
                              onChange={(e) => setNewSibling({ ...newSibling, name: e.target.value })}
                              placeholder="Enter sibling name"
                              className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="siblingDob" className="text-sm font-semibold text-gray-700">
                              Date of Birth
                            </Label>
                            <Input
                              id="siblingDob"
                              type="date"
                              value={newSibling.dateOfBirth}
                              onChange={(e) => setNewSibling({ ...newSibling, dateOfBirth: e.target.value })}
                              className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="space-y-2">
                            <Label htmlFor="siblingGender" className="text-sm font-semibold text-gray-700">
                              Gender
                            </Label>
                            <Select
                              value={newSibling.gender}
                              onValueChange={(value) => setNewSibling({ ...newSibling, gender: value })}
                            >
                              <SelectTrigger id="siblingGender" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
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
                            <Label htmlFor="siblingOccupation" className="text-sm font-semibold text-gray-700">
                              Occupation
                            </Label>
                            <Input
                              id="siblingOccupation"
                              value={newSibling.occupation}
                              onChange={(e) => setNewSibling({ ...newSibling, occupation: e.target.value })}
                              placeholder="Enter occupation"
                              className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="siblingContact" className="text-sm font-semibold text-gray-700">
                              Contact Number
                            </Label>
                            <Input
                              id="siblingContact"
                              value={newSibling.contact}
                              onChange={(e) => setNewSibling({ ...newSibling, contact: e.target.value })}
                              placeholder="10-digit phone number"
                              className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="siblingMarital" className="text-sm font-semibold text-gray-700">
                            Marital Status
                          </Label>
                          <Select
                            value={newSibling.maritalStatus}
                            onValueChange={(value) => setNewSibling({ ...newSibling, maritalStatus: value })}
                          >
                            <SelectTrigger id="siblingMarital" className="h-11 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500">
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

                        <Button
                          type="button"
                          onClick={addSibling}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Sibling
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
                    <SectionHeader title="Documents" subtitle="Identity and verification documents" />

                    <div className="space-y-5">
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
                          ID Proof Document
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="idProof"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setIdProofFile(file);
                                toast.success(`Selected: ${file.name}`);
                              }
                            }}
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        {idProofFile && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            Selected: {idProofFile.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Accepted formats: PDF, JPG, JPEG, PNG
                        </p>
                      </div>
                    </div>
                  </FormSection>

                  {/* Banking Information */}
                  <FormSection>
                    <SectionHeader title="Banking Information" subtitle="Bank account and financial details" />

                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="bankAccount" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-blue-600" />
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
            {currentStep < STEPS.length ? (
              <Button
                type="button"
                variant="default"
                onClick={handleNext}
                disabled={isSubmitting || !isStepValid()}
                className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Employee
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
