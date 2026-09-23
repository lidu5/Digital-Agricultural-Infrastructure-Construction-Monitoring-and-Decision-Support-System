from rest_framework import permissions


class ProjectPermission(permissions.BasePermission):
    """
    Admin          -> full access to everything.
    Regional Mgr   -> full CRUD, but only within their own region.
    National Viewer-> read everything; may PATCH only 'priority_level'.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == 'admin':
            return True

        if user.role == 'regional_manager':
            return True  # narrowed to their own region in get_queryset / object check

        if user.role == 'national_viewer':
            if request.method in permissions.SAFE_METHODS:
                return True
            if request.method == 'PATCH':
                # field-level restriction enforced in the view
                return True
            return False

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role == 'admin':
            return True

        if user.role == 'regional_manager':
            return obj.region_id == user.region_id

        if user.role == 'national_viewer':
            if request.method in permissions.SAFE_METHODS:
                return True
            if request.method == 'PATCH':
                return True  # field restriction enforced in the view
            return False

        return False