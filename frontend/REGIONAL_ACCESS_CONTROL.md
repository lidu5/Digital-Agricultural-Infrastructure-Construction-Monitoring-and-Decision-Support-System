# Regional Access Control Implementation

## Overview

The DIPCMT-DSS system now implements **role-based access control** with regional scoping for Regional Bureau Managers. This ensures that users only see and can edit data relevant to their role and assigned region.

## User Roles and Permissions

### 1. **System Administrator** (`admin`)
- **Access**: Full access to all regions
- **Permissions**: 
  - View all projects, contracts, monitoring data across all regions
  - Full CRUD on all entities
  - Access to Admin module (user management, organizations, lookup tables, geography)
  - Can manage users and assign roles

### 2. **Regional Bureau Manager** (`regional_manager`)
- **Access**: Own region only (scoped by `user.region`)
- **Permissions**:
  - View projects where `project.region === user.region`
  - Full CRUD on:
    - Projects (in their region)
    - Contracts (linked to regional projects)
    - Progress records (for regional projects)
    - Milestones (for regional projects)
    - Issues (for regional projects)
    - Documents (for regional projects)
  - Views regional dashboard (filtered to their region)
  - **Cannot access**: Admin module, other regions' data

### 3. **National Viewer** (`national_viewer`)
- **Access**: All regions (read-only)
- **Permissions**:
  - View all projects, contracts, monitoring data across all regions
  - **Read-only**: Cannot create, edit, or delete any records
  - Views national dashboard with all regions
  - **Cannot access**: Admin module

## Implementation Details

### AuthContext (`src/contexts/AuthContext.jsx`)

Provides authentication state and permission checking throughout the app:

```javascript
const { 
  user,                    // Current user object with role, region, etc.
  hasPermission,           // Check if user has specific permission
  canAccessProject,        // Check if user can view a project
  canEditProject,          // Check if user can edit a project
  isAdmin,                 // Boolean: is user an admin?
  isRegionalManager,       // Boolean: is user a regional manager?
  isNationalViewer,        // Boolean: is user a national viewer?
  userRegion,              // User's assigned region ID
} = useAuth()
```

### Permission Checks

**View Access:**
```javascript
canAccessProject(project) {
  if (user.role === 'admin' || user.role === 'national_viewer') return true
  if (user.role === 'regional_manager') {
    return project.region === user.region
  }
  return false
}
```

**Edit Access:**
```javascript
canEditProject(project) {
  if (user.role === 'admin') return true
  if (user.role === 'regional_manager') {
    return project.region === user.region
  }
  return false  // National viewers cannot edit
}
```

### UI Components with Access Control

#### Layout Component
- Shows user's name, role badge, and region (if applicable)
- Conditionally displays "Admin" menu item (only for admins)
- Uses `hasPermission('admin')` to control visibility

#### Project Detail Page
- Checks `canAccessProject()` on load - redirects if no access
- Uses `canEdit` variable to show/hide edit buttons
- Regional managers can only edit projects in their region

#### Dashboard
- Backend should filter data based on user's region
- Regional managers see only their region's statistics
- National viewers and admins see all regions

## Backend Requirements

The backend API must enforce these same permissions:

### ViewSet Permissions (Django)
```python
class ProjectViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin' or user.role == 'national_viewer':
            return Project.objects.all()
        elif user.role == 'regional_manager':
            return Project.objects.filter(region=user.region)
        return Project.objects.none()
    
    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'regional_manager':
            # Force region to user's region
            serializer.save(region=user.region)
        else:
            serializer.save()
```

### API Endpoints Expected

- `GET /accounts/me/` - Returns current user with role, region, full_name
- All list endpoints should filter based on user's region automatically
- Edit/delete operations should return 403 if user lacks permission

## User Information Display

The navigation bar now shows:
- User's full name
- Role badge (color-coded):
  - **Red**: System Administrator
  - **Yellow**: Regional Manager
  - **Blue**: National Viewer
- Region name (for Regional Managers only)

## Testing Regional Access

### As Regional Manager (e.g., Amhara Region):
1. Login with regional manager credentials
2. Navigate to Projects - should only see Amhara region projects
3. Try to view project from another region - should redirect to projects list
4. Edit buttons should only appear on Amhara region projects
5. Admin menu should not be visible

### As National Viewer:
1. Login with national viewer credentials
2. Navigate to Projects - should see all regions
3. Edit/delete buttons should not appear anywhere
4. Can view all project details but cannot modify
5. Admin menu should not be visible

### As Admin:
1. Login with admin credentials
2. Full access to all regions and all data
3. Can edit/delete any record
4. Admin menu is visible
5. Can manage users, organizations, lookup tables

## Security Notes

- Frontend access control is for UX only
- **Backend must enforce all permissions** - never trust the frontend
- Token-based authentication with user context
- Regional scoping happens at the database query level
- Admins can impersonate other roles for testing (if implemented)

## Future Enhancements

- Audit logging for all CRUD operations
- Bulk operations with regional validation
- Export/import with regional filtering
- Advanced role customization (custom permissions per user)
- Multi-region assignments for special users
