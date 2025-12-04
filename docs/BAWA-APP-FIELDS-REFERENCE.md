# Bawa App Fields Reference

## Employee/Staff Creation Fields

Based on the existing Bawa Group application, these are ALL the fields that must be included in KalsoHR's employee module:

### Personal Information
- `firstName` (VARCHAR 100) - Required
- `lastName` (VARCHAR 100)
- `dateOfBirth` (DATE)
- `genderId` (INT) - Foreign key to genders table
- `bloodGroupId` (INT) - Foreign key to blood_groups table
- `religion` (VARCHAR 100) - Or foreign key to religions table
- `community` (VARCHAR 100) - Or foreign key to communities table
- `profilePicture` (VARCHAR 255) - File upload path

### Contact Information
- `email` (VARCHAR 255)
- `phoneNumber` (VARCHAR 20)
- `emergencyContactName` (VARCHAR 100)
- `emergencyContactNumber` (VARCHAR 20)

### Address
- `address` (TEXT) - Current address
- `city` (VARCHAR 100)
- `state` (VARCHAR 100)
- `postalCode` (VARCHAR 20)

### Employment Details
- `employeeId` (VARCHAR 50) - Unique, auto-generated (format: EMP-XXXX)
- `hireDate` (DATE) - Date of joining
- `departmentId` (INT) - Foreign key to departments
- `designationId` (INT) - Foreign key to designations
- `employmentTypeId` (INT) - Foreign key to employment_types (Full-time, Part-time, etc.)
- `salary` (DECIMAL 10,2)
- `isActive` (BOOLEAN) - Active/Inactive status
- `employmentStatus` (ENUM) - Active, On Leave, Terminated

### Education
- `educationLevel` (VARCHAR 100) - Highest qualification
- `degrees` (TEXT) - Degrees obtained

### Identification
- `idProof` (VARCHAR 255) - ID proof document path

### Family Information - Father
- `father_name` (VARCHAR 100)
- `father_occupation` (VARCHAR 100)
- `father_contact` (VARCHAR 20)
- `father_status` (VARCHAR 50) - Alive/Deceased

### Family Information - Mother
- `mother_name` (VARCHAR 100)
- `mother_occupation` (VARCHAR 100)
- `mother_contact` (VARCHAR 20)
- `mother_status` (VARCHAR 50) - Alive/Deceased

### Family Information - General
- `family_address` (TEXT) - Family/permanent address

### Siblings Information (Separate Table: siblings)
Multiple siblings per staff member:
- `staff_id` (INT) - Foreign key to staff
- `name` (VARCHAR 100)
- `date_of_birth` (DATE)
- `gender` (VARCHAR 20)
- `occupation` (VARCHAR 100)
- `marital_status` (VARCHAR 50)
- `contact` (VARCHAR 20)
- `status` (VARCHAR 50) - Alive/Deceased
- `is_emergency_contact` (BOOLEAN)

### Store/Branch Assignments
Managed via `staff_store_mapping` table (many-to-many):
- `staff_id` (INT)
- `store_id` (INT)
- `is_active` (BOOLEAN)

### Metadata (Standard for all tables)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)
- `created_by` (INT) - User ID who created
- `updated_by` (INT) - User ID who last updated

## Notes for KalsoHR Implementation

1. **All these fields MUST be included** in the employees table
2. **Add organization_id** to make it multi-tenant
3. **File uploads** need to be handled:
   - Profile picture
   - ID proof document
   - Any additional documents

4. **Siblings table** should be:
   - `employee_siblings` (not just siblings)
   - Include `organization_id` for multi-tenant

5. **Store/Branch mapping**:
   - Rename to `employee_branch_mapping`
   - Include `organization_id`
   - Allow multiple branch assignments

6. **Consider adding these modern fields**:
   - `aadhar_number` (VARCHAR 12)
   - `pan_number` (VARCHAR 10)
   - `uan_number` (VARCHAR 12) - For PF
   - `bank_account_number` (VARCHAR 20)
   - `bank_ifsc_code` (VARCHAR 11)
   - `alternate_phone` (VARCHAR 20)
   - `permanent_address` (TEXT) - Separate from current address

## Database Schema Update Required

The DATABASE-SCHEMA.md employees table needs to be updated to include ALL these fields from the Bawa app, not the simplified version currently written.

## UI/UX Considerations

Based on Bawa app's add-staff component:
- Multi-step form (Personal → Contact → Employment → Family → Documents)
- File upload for profile picture and documents
- Dynamic sibling addition (add/remove multiple siblings)
- Branch assignment via checkboxes or multi-select
- Auto-generate employee ID on form submit
- Validation for required fields
- Date pickers for dates
- Dropdowns for master data (department, designation, etc.)

---

**Action Item:** Update the Prisma schema for employees table to include ALL these fields before proceeding with implementation.

*Reference: Bawa Group app staff table and add-staff component*
*Created: December 4, 2025*
