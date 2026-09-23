from rest_framework import permissions


class ContractScopedPermission(permissions.BasePermission):
    """
    Admin          -> full access to everything.
    Regional Mgr   -> full CRUD, but only for contracts (and their
                       variation orders / EoTs / IPCs / claims) whose
                       parent project belongs to their own region.
    National Viewer-> read-only, no exceptions here (unlike projects,
                       contracts have no field they're allowed to edit).
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == 'admin':
            return True
        if user.role == 'regional_manager':
            return True  # narrowed per-object below
        if user.role == 'national_viewer':
            return request.method in permissions.SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role == 'admin':
            return True

        # obj is a Contract, or something with a .contract (VO/EoT/IPC/Claim)
        project_region_id = getattr(obj, 'project', None) and obj.project.region_id
        if project_region_id is None and hasattr(obj, 'contract'):
            project_region_id = obj.contract.project.region_id

        if user.role == 'regional_manager':
            return project_region_id == user.region_id

        if user.role == 'national_viewer':
            return request.method in permissions.SAFE_METHODS

        return False