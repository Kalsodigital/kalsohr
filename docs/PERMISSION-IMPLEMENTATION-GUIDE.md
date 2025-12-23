# Permission Implementation Guide

## Overview

This guide outlines the **standard pattern** for implementing permission controls across the KalsoHR application. All features and modules must follow this pattern to ensure consistent security and user experience.

## Core Principle: Defense in Depth

Always implement permission checks at **BOTH** levels:
1. **Backend API** (Security - Critical)
2. **Frontend UI** (User Experience)

Even if the frontend is bypassed, the backend API must remain secure.

---

## 1. Backend API Protection

### Required for ALL Routes

Add `checkPermission` middleware to every route that requires access control.

### Permission Mapping

| HTTP Method | Action | Permission Required |
|-------------|--------|---------------------|
| GET | Read/View | `canRead` |
| POST | Create | `canWrite` |
| PUT/PATCH | Update | `canUpdate` |
| DELETE | Delete | `canDelete` |

### Implementation Pattern

**File:** `src/routes/superadmin.routes.ts` (or relevant routes file)

```typescript
import { checkPermission } from '../middleware/permission.middleware';

// READ - View all items
router.get('/endpoint', checkPermission('module_code', 'canRead'), controllerFunction);

// READ - View single item
router.get('/endpoint/:id', checkPermission('module_code', 'canRead'), controllerFunction);

// CREATE - Add new item
router.post('/endpoint', checkPermission('module_code', 'canWrite'), controllerFunction);

// UPDATE - Modify existing item
router.put('/endpoint/:id', checkPermission('module_code', 'canUpdate'), controllerFunction);

// DELETE - Remove item
router.delete('/endpoint/:id', checkPermission('module_code', 'canDelete'), controllerFunction);
```

### Example: Master Data Routes

```typescript
// Countries
router.get('/masters/countries', checkPermission('master_data', 'canRead'), getAllCountries);
router.post('/masters/countries', checkPermission('master_data', 'canWrite'), createCountry);
router.put('/masters/countries/:id', checkPermission('master_data', 'canUpdate'), updateCountry);
router.delete('/masters/countries/:id', checkPermission('master_data', 'canDelete'), deleteCountry);

// States
router.get('/masters/states', checkPermission('master_data', 'canRead'), getAllStates);
router.post('/masters/states', checkPermission('master_data', 'canWrite'), createState);
router.put('/masters/states/:id', checkPermission('master_data', 'canUpdate'), updateState);
router.delete('/masters/states/:id', checkPermission('master_data', 'canDelete'), deleteState);
```

---

## 2. Frontend UI Controls

### Page-Level Access Control

Use `useModuleAccess` hook to protect entire pages from unauthorized access.

**File:** `app/superadmin/[module]/page.tsx`

```typescript
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';

export default function ModulePage() {
  // Check module access - redirects to /forbidden if no permission
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('module_code', true);

  // Don't render until permission check is complete
  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Rest of component...
}
```

### Button-Level Permission Checks

Use `usePermissions` hook to control individual action buttons.

**Import:**
```typescript
import { usePermissions } from '@/lib/hooks/usePermissions';
```

**Inside Component:**
```typescript
const { hasPermission } = usePermissions();
```

### Button Implementation Pattern

#### Add/Create Button
```typescript
<Button
  onClick={() => handleCreate()}
  disabled={!hasPermission('module_code', 'canWrite')}
  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Plus className="w-4 h-4 mr-2" />
  Add Item
</Button>
```

#### Edit Button
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => handleEdit(item)}
  disabled={!hasPermission('module_code', 'canUpdate')}
>
  <Pencil className="w-3 h-3" />
</Button>
```

#### Delete Button
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => handleDelete(item)}
  disabled={!hasPermission('module_code', 'canDelete')}
>
  <Trash2 className="w-3 h-3 text-red-600" />
</Button>
```

### Complete Example: Countries Page

```typescript
'use client';

import { usePermissions } from '@/lib/hooks/usePermissions';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';

export default function CountriesPage() {
  // Page-level access control
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);

  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Button-level permission checks
  const { hasPermission } = usePermissions();

  return (
    <div>
      {/* Add Country Button */}
      <Button
        onClick={() => handleOpenDialog()}
        disabled={!hasPermission('master_data', 'canWrite')}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Country
      </Button>

      {/* Table with Edit/Delete buttons */}
      <Table>
        {countries.map((country) => (
          <TableRow key={country.id}>
            <TableCell>{country.name}</TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(country)}
                disabled={!hasPermission('master_data', 'canUpdate')}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(country)}
                disabled={!hasPermission('master_data', 'canDelete')}
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
```

---

## 3. Permission Refresh Behavior

### Automatic Refresh (Built-in)

When permissions are updated via the **Roles & Permissions** dialog:

1. System calls `refreshUserData()` to fetch updated permissions from the API
2. Shows toast notification: "Your permissions have been refreshed. The page will reload."
3. Automatically reloads the page after 1 second
4. All components pick up the new permissions

**Location:** `app/superadmin/roles/manage-permissions-dialog.tsx`

```typescript
const { user, refreshUserData } = useAuthStore();

const handleSubmit = async () => {
  await updateRolePermissions(role.id, permissionsArray);

  // If current user's role was updated, refresh their permissions
  if (user?.role?.id === role.id) {
    await refreshUserData();
    toast.success('Your permissions have been refreshed. The page will reload.');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
};
```

### Manual Refresh

Users can manually refresh the page to see updated permissions:
- **Windows/Linux:** `F5` or `Ctrl+R`
- **Mac:** `Cmd+R`

### Important Notes

- **No logout required:** Permission updates are reflected immediately after page refresh
- **User data is refreshed:** The `refreshUserData()` function fetches fresh user data with updated permissions from `/api/auth/me`
- **Cached permissions are cleared:** Page reload ensures all React components re-initialize with new permissions

---

## 4. Module Codes Reference

| Module | Code | Description |
|--------|------|-------------|
| Organizations | `organizations` | Organization management |
| Accounts/Users | `accounts` | User account management |
| Platform Roles | `platform_roles` | Super admin role management |
| Master Data | `master_data` | Countries, States, etc. |

**Location:** `src/constants/modules.ts`

---

## 5. Reference Implementations

### Backend
**File:** `src/routes/superadmin.routes.ts`
- Organizations routes (Lines 63-91)
- Master Data routes (Lines 237-304)

### Frontend
**File:** `app/superadmin/organizations/page.tsx`
- Complete implementation with all permission checks
- Page-level access control (Lines 43-50)
- Button-level controls (Lines 169-174, 350, 359)

---

## 6. Checklist for New Features

When implementing a new feature with permissions:

### Backend
- [ ] Add `checkPermission` middleware to ALL routes
- [ ] Use correct permission for each HTTP method (canRead, canWrite, canUpdate, canDelete)
- [ ] Use correct module code from constants
- [ ] Test API returns 403 Forbidden for unauthorized users

### Frontend
- [ ] Add `useModuleAccess` hook for page-level protection
- [ ] Add early return if no access
- [ ] Import `usePermissions` hook
- [ ] Add `disabled` attribute to all action buttons
- [ ] Add disabled styling classes
- [ ] Test buttons are disabled when permissions are missing
- [ ] Test buttons are enabled when permissions are granted
- [ ] Test page refresh after permission update

### Testing
- [ ] Test with user having only READ permission
- [ ] Test with user having full permissions (Read, Write, Update, Delete)
- [ ] Test with user having no permissions
- [ ] Test direct API calls return proper 403 errors
- [ ] Test permission refresh without logout/login

---

## 7. Common Mistakes to Avoid

### ❌ Don't Do This

1. **Frontend-only protection:**
   ```typescript
   // BAD - Only frontend check, API is vulnerable
   router.post('/endpoint', createItem); // No permission check!
   ```

2. **Backend-only protection:**
   ```typescript
   // BAD - Button always enabled, user sees errors
   <Button onClick={handleCreate}>Add Item</Button>
   ```

3. **Wrong permission for action:**
   ```typescript
   // BAD - Delete should use canDelete, not canWrite
   router.delete('/endpoint/:id', checkPermission('module', 'canWrite'), deleteItem);
   ```

4. **Missing disabled styling:**
   ```typescript
   // BAD - Button appears enabled but doesn't work
   <Button disabled={!hasPermission('module', 'canWrite')}>Add</Button>
   ```

### ✅ Do This

1. **Both backend AND frontend protection:**
   ```typescript
   // Backend
   router.post('/endpoint', checkPermission('module', 'canWrite'), createItem);

   // Frontend
   <Button
     onClick={handleCreate}
     disabled={!hasPermission('module', 'canWrite')}
     className="disabled:opacity-50 disabled:cursor-not-allowed"
   >
     Add Item
   </Button>
   ```

2. **Correct permission for each action:**
   - GET → `canRead`
   - POST → `canWrite`
   - PUT/PATCH → `canUpdate`
   - DELETE → `canDelete`

3. **Always add disabled styling:**
   ```typescript
   className="... disabled:opacity-50 disabled:cursor-not-allowed"
   ```

---

## 8. Security Best Practices

1. **Trust the backend, not the frontend:**
   - Frontend UI controls are for user experience only
   - Backend API is the source of truth for security
   - Even if frontend is bypassed, backend must remain secure

2. **Use specific permissions:**
   - Don't use generic "admin" checks
   - Use granular permissions (canRead, canWrite, canUpdate, canDelete)
   - Each module should have its own permission set

3. **Validate on every request:**
   - Don't cache permission checks on the backend
   - Middleware runs on every request
   - User permissions can change at any time

4. **Proper error responses:**
   - Return `403 Forbidden` for permission denied
   - Return `401 Unauthorized` for authentication required
   - Don't leak information in error messages

---

## 9. Troubleshooting

### Buttons remain enabled after removing permissions

**Cause:** Frontend is using cached user data

**Solution:** Refresh the page (`F5`/`Cmd+R`) or wait for automatic reload after permission update

### API returns 403 but buttons are enabled

**Cause:** Frontend permission check is missing or incorrect

**Solution:** Add `disabled={!hasPermission('module', 'action')}` to buttons

### User can access page directly via URL

**Cause:** Missing `useModuleAccess` hook

**Solution:** Add page-level access control with early return

### Permissions not updating even after logout/login

**Cause:** Stale data in localStorage or auth store

**Solution:** Clear browser storage or check auth token refresh logic

---

## 10. Support and Questions

For questions or clarifications about permission implementation:

1. Review reference implementations (Organizations module)
2. Check this guide
3. Consult the project maintainers

---

**Last Updated:** 2025-12-07
**Version:** 1.0
