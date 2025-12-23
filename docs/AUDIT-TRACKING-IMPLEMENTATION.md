# Audit Tracking Implementation Guide

This guide shows how to display audit information (created by, updated by) throughout the application.

## Overview

All database tables now have audit tracking fields:
- `createdAt` - Timestamp when record was created
- `updatedAt` - Timestamp when record was last updated
- `createdBy` - User ID who created the record
- `updatedBy` - User ID who last updated the record

### Permission Requirements

**Viewing audit information requires the "Approve" permission** for the module. This ensures:
- Sensitive information (who created/updated records) is only visible to authorized users
- Regular users see timestamps but not user details
- Managers and admins with "Approve" permission see full audit trails

**Security Implementation:**
- Backend checks `canApprove` permission before returning creator/updater data
- Frontend automatically hides audit popup if data is not provided
- No sensitive data is sent to unauthorized users

## Implementation Pattern

### 1. Setting Audit Fields on Create/Update

**IMPORTANT**: Always set `createdBy` and `updatedBy` when creating or updating records.

**On Create:**
```typescript
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId; // Get authenticated user ID
    const { name, code, description } = req.body;

    const department = await prisma.department.create({
      data: {
        name,
        code,
        description,
        organizationId,
        createdBy: userId,  // Set creator
        updatedBy: userId,  // Set initial updater (same as creator)
      },
    });

    return sendSuccess(res, { department });
  } catch (error) {
    // Error handling
  }
};
```

**On Update:**
```typescript
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId; // Get authenticated user ID
    const { id } = req.params;
    const { name, code } = req.body;

    const department = await prisma.department.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        updatedBy: userId,  // Always set updater on update
      },
    });

    return sendSuccess(res, { department });
  } catch (error) {
    // Error handling
  }
};
```

### 2. Permission Check for Audit Data

**IMPORTANT**: Check if user has permission to view audit information before fetching it.

```typescript
import { canViewAuditInfo } from '../utils/permissions';

export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;

    // Check if user has "Approve" permission for this module
    const canViewAudit = await canViewAuditInfo(user, 'master_data');
```

### 3. Backend Controller Updates - Fetching Audit Data

Update your controllers to include creator and updater details in the API response **only if user has permission**.

**Example: Department Controller** (`src/controllers/department.controller.ts`)

```typescript
export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;

    // Check permission first
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    // Fetch departments - conditionally include audit fields
    const departments = await prisma.department.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        // ... other fields
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,  // Only select if user has permission
        updatedBy: canViewAudit,  // Only select if user has permission
      },
    });

    // Only fetch creator/updater details if user has permission
    if (canViewAudit) {
      // Collect all unique user IDs
      const userIds = new Set<number>();
      departments.forEach(dept => {
        if (dept.createdBy) userIds.add(dept.createdBy);
        if (dept.updatedBy) userIds.add(dept.updatedBy);
      });

      // Fetch user details in bulk
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      // Create a map for quick lookup
      const userMap = new Map(users.map(u => [u.id, u]));

      // Attach creator and updater to each department
      const departmentsWithAudit = departments.map(dept => ({
        ...dept,
        creator: dept.createdBy ? userMap.get(dept.createdBy) : null,
        updater: dept.updatedBy ? userMap.get(dept.updatedBy) : null,
      }));

      return sendSuccess(res, { departments: departmentsWithAudit });
    }

    // User doesn't have permission - return without audit info
    return sendSuccess(res, { departments });
  } catch (error) {
    // Error handling
  }
};
```

**For Single Record Endpoints:**

```typescript
export const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findFirst({
      where: { id: parseInt(id) },
      // include other relations
    });

    if (!department) {
      return sendError(res, 'Not found', 404);
    }

    // Fetch creator and updater
    const userIds: number[] = [];
    if (department.createdBy) userIds.push(department.createdBy);
    if (department.updatedBy) userIds.push(department.updatedBy);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const departmentWithAudit = {
      ...department,
      creator: department.createdBy ? userMap.get(department.createdBy) : null,
      updater: department.updatedBy ? userMap.get(department.updatedBy) : null,
    };

    return sendSuccess(res, { department: departmentWithAudit });
  } catch (error) {
    // Error handling
  }
};
```

### 2. Frontend Type Updates

Update your TypeScript interfaces to include audit fields.

**Example: Department Type** (`lib/api/org/departments.ts`)

```typescript
export interface Department {
  id: number;
  name: string;
  // ... other fields
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  creator?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  updater?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}
```

### 3. Display Audit Information

You can display audit information in two ways:

#### Option A: Hover Card (Recommended for Tables)

Use the `AuditHoverIcon` component to show audit information in a sleek popup on hover.

**Component Location:** `components/ui/audit-hover-card.tsx`

**Usage in Tables:**

```tsx
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';

// In your table component
<TableCell>
  <div className="flex items-center gap-3">
    <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
      <Briefcase className="w-4 h-4 text-indigo-600" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium">{item.name}</span>
        <AuditHoverIcon
          createdAt={item.createdAt}
          creator={item.creator}
          updatedAt={item.updatedAt}
          updater={item.updater}
        />
      </div>
      {item.description && (
        <p className="text-xs text-gray-500">{item.description}</p>
      )}
    </div>
  </div>
</TableCell>
```

**The hover card displays:**
- A small info icon that appears on hover
- Rich popup with created/updated information
- User details with avatars
- Color-coded sections (green for created, blue for updated)
- Smooth animations

#### Option B: Inline Display

Use the `AuditInfo` component to display audit information inline.

**Component Location:** `components/ui/audit-info.tsx`

**Usage in Tables (Compact Variant):**

```tsx
import { AuditInfo } from '@/components/ui/audit-info';

// In your table component
<TableCell>
  <div className="space-y-1">
    <span className="font-medium">{item.name}</span>
    <AuditInfo
      createdAt={item.createdAt}
      creator={item.creator}
      updatedAt={item.updatedAt}
      updater={item.updater}
      variant="compact"
    />
  </div>
</TableCell>
```

**Usage in Detail Views (Default Variant):**

```tsx
<div className="mt-4">
  <AuditInfo
    createdAt={item.createdAt}
    creator={item.creator}
    updatedAt={item.updatedAt}
    updater={item.updater}
  />
</div>
```

**Usage in Dialogs/Modals (Detailed Variant):**

```tsx
<div className="mt-6 p-4 bg-gray-50 rounded-lg">
  <AuditInfo
    createdAt={item.createdAt}
    creator={item.creator}
    updatedAt={item.updatedAt}
    updater={item.updater}
    variant="detailed"
  />
</div>
```

## When to Use Which Component

### Use AuditHoverIcon (Hover Card) When:
- ✅ Displaying audit info in **tables** (saves space)
- ✅ You want a **clean, minimal UI**
- ✅ Audit info is **secondary** information
- ✅ You need to show **rich details** without cluttering the interface

### Use AuditInfo (Inline) When:
- ✅ Audit info should be **immediately visible**
- ✅ In **detail views** or **forms** where space isn't limited
- ✅ Audit trail is a **primary** concern for the feature
- ✅ Users need to **compare** audit info across multiple items

## AuditHoverCard Features

The hover card provides a beautiful, animated popup showing:
- **Created** section with green accent and user avatar
- **Last Updated** section with blue accent (only if record was updated)
- Full timestamps with formatted dates
- User names and email addresses
- Smooth fade-in/fade-out animations
- Smart positioning (auto-adjusts to viewport)
- Configurable delay (200ms open, 100ms close)

## AuditInfo Component Variants

### Compact Variant
- Minimal space usage
- Shows date/time with icons
- Ideal for table rows
- Example: `Created: Mar 15, 2024 2:30 PM • Updated: Mar 20, 2024 4:15 PM`

### Default Variant
- Shows dates with user names inline
- Good for cards and summaries
- Example:
  ```
  Created: Mar 15, 2024 2:30 PM by John Doe
  Updated: Mar 20, 2024 4:15 PM by Jane Smith
  ```

### Detailed Variant
- Full information with icons and labels
- Best for detail views and dialogs
- Vertical layout with clear separation
- Shows user icons, dates, and names

## AuditBadge Component

For showing just the last updated date in a compact badge format:

```tsx
import { AuditBadge } from '@/components/ui/audit-info';

<TableCell>
  <AuditBadge updatedAt={item.updatedAt} />
</TableCell>
```

## Implementation Checklist

When adding audit tracking to a new module:

### Backend
- [ ] **Set audit fields on create/update**:
  - Get user ID: `const userId = (req as any).user?.userId;`
  - On create: Set both `createdBy: userId` and `updatedBy: userId`
  - On update: Set `updatedBy: userId`
- [ ] Add `createdBy` and `updatedBy` to the model's `select` statement
- [ ] Fetch user details for creators and updaters (use bulk fetch for lists)
- [ ] Create a user map for efficient lookup
- [ ] Attach `creator` and `updater` objects to the response

### Frontend
- [ ] Update TypeScript interface to include audit fields (make creator/updater optional)
- [ ] Import `AuditHoverIcon` or `AuditInfo` component
- [ ] Add component to the appropriate UI location (table, detail view, dialog)
- [ ] Choose appropriate variant based on context
- [ ] **No additional permission check needed** - component auto-hides if data is not provided

## Controllers to Update

Apply this pattern to all controllers:

**Platform (Super Admin):**
- ✅ Organizations
- ✅ Users
- ✅ Roles
- ✅ Subscription Plans

**Organization:**
- ✅ Departments (COMPLETED - reference implementation)
- [ ] Designations
- [ ] Employment Types
- [ ] Branches
- [ ] Organizational Positions
- [ ] Job Positions
- [ ] Employees
- [ ] Attendance
- [ ] Leave Types
- [ ] Leave Requests
- [ ] Holidays
- [ ] Candidates
- [ ] Applications
- [ ] Interview Schedules

## Notes

- **Performance:** The bulk user fetch pattern ensures we make only 2 database queries regardless of the number of records
- **Null Handling:** The component gracefully handles cases where creator/updater data is not available
- **Date Formatting:** Uses `date-fns` for consistent, locale-aware date formatting
- **Flexibility:** Three variants allow you to choose the right level of detail for each context

## Example Complete Implementation

See `src/controllers/department.controller.ts` and `app/[orgSlug]/masters/departments/page.tsx` for a complete reference implementation.
