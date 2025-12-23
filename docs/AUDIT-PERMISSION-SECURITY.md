# Audit Information Permission Security

## Overview

Audit information (who created/updated records) is **permission-protected** and only visible to authorized users.

## Permission Requirement

**To view audit information, users must have the "Approve" permission** for the module.

This ensures:
- ✅ Sensitive user information is protected
- ✅ Only managers/admins can see who created/modified records
- ✅ Regular users see timestamps but not user details
- ✅ No sensitive data sent to unauthorized users

## How It Works

### Backend Security

1. **Permission Check**
   ```typescript
   import { canViewAuditInfo } from '../utils/permissions';

   const user = (req as any).user;
   const canViewAudit = await canViewAuditInfo(user, 'master_data');
   ```

2. **Conditional Data Selection**
   ```typescript
   const departments = await prisma.department.findMany({
     select: {
       // ... other fields
       createdBy: canViewAudit,  // Only select if has permission
       updatedBy: canViewAudit,  // Only select if has permission
     },
   });
   ```

3. **Conditional User Fetch**
   ```typescript
   if (canViewAudit) {
     // Fetch creator/updater details
     const users = await prisma.user.findMany(...);
     // Attach to response
   } else {
     // Return without audit info
   }
   ```

### Frontend Behavior

The `AuditHoverIcon` component automatically adapts:

**User WITH "Approve" Permission:**
- API returns `creator` and `updater` objects
- Info icon appears next to record names
- Hover shows full audit details

**User WITHOUT "Approve" Permission:**
- API returns `null` for `creator` and `updater`
- Info icon does NOT appear
- No audit information displayed

**No manual permission check needed in frontend** - it just works!

## Permission Matrix

| User Role | canApprove | Sees Audit Info? | Sees Info Icon? |
|-----------|-----------|------------------|-----------------|
| Regular User | ❌ No | ❌ No | ❌ No |
| Manager | ✅ Yes | ✅ Yes | ✅ Yes |
| Admin | ✅ Yes | ✅ Yes | ✅ Yes |
| Super Admin | ✅ Yes | ✅ Yes | ✅ Yes |

## Security Benefits

### 1. Data Protection
- User details only sent over network if user has permission
- Reduces attack surface for data leakage
- Complies with privacy best practices

### 2. Access Control
- Granular control at module level
- Can configure different permissions per role
- Flexible for different organizational needs

### 3. Zero-Trust Approach
- Backend validates permission every request
- Frontend cannot bypass security
- No client-side permission checks (unreliable)

## Configuration

### Granting Audit View Permission

To allow a role to view audit information:

1. Go to **Roles & Permissions**
2. Select the role
3. Find the module (e.g., "Master Data")
4. **Enable "Approve" permission**
5. Save

Users with this role will now see:
- Who created each record
- Who last updated each record
- Full timestamps with user names

### Why "Approve" Permission?

The `canApprove` permission was chosen because:
- Approvers typically need to see audit trails
- It's an existing permission (no new field needed)
- Makes sense contextually (audit = oversight)
- Can be easily changed to a different permission if needed

## Implementation Files

### Backend
- **Permission Helper**: `src/utils/permissions.ts`
  - `canViewAuditInfo()` function
  - Checks if user has "Approve" permission

- **Department Controller**: `src/controllers/department.controller.ts`
  - Reference implementation
  - Shows permission check pattern

### Frontend
- **Audit Hover Card**: `components/ui/audit-hover-card.tsx`
  - `AuditHoverIcon` component
  - Auto-hides if no audit data

## Testing

### Test Case 1: User with Permission
1. Login as user with "Approve" permission
2. Navigate to Departments
3. ✅ Should see info icon next to departments
4. ✅ Hover should show creator/updater names

### Test Case 2: User without Permission
1. Login as user WITHOUT "Approve" permission
2. Navigate to Departments
3. ✅ Should NOT see info icon
4. ✅ API should not return creator/updater data

### Test Case 3: Permission Change
1. Start without "Approve" permission (no icon)
2. Admin grants "Approve" permission
3. Refresh page
4. ✅ Icon should now appear

## Migration Notes

For existing data:
- Old records may have `null` for `createdBy`/`updatedBy`
- New records automatically track creator/updater
- Popup handles null values gracefully (shows "Unknown User")

## Customization

### Using a Different Permission

To use a different permission (e.g., `canExport`):

Edit `src/utils/permissions.ts`:
```typescript
export async function canViewAuditInfo(user: any, moduleCode: string): Promise<boolean> {
  return hasPermission(user, moduleCode, 'canExport'); // Changed from canApprove
}
```

### Module-Specific Permissions

Different modules can have different requirements:

```typescript
// For sensitive HR data - require canDelete
if (moduleCode === 'employees') {
  return hasPermission(user, moduleCode, 'canDelete');
}

// For other modules - require canApprove
return hasPermission(user, moduleCode, 'canApprove');
```

## Best Practices

1. **Always Use Permission Helper**
   - Don't manually check permissions
   - Use `canViewAuditInfo()` for consistency

2. **Don't Send Unnecessary Data**
   - Check permission before fetching user details
   - Don't rely on frontend to hide data

3. **Document Permission Requirements**
   - Update user guides
   - Train admins on permission setup

4. **Test Both Cases**
   - Test with permission enabled
   - Test with permission disabled
   - Verify no data leakage

---

**Security Status**: ✅ Implemented & Active
**Last Updated**: December 2024
