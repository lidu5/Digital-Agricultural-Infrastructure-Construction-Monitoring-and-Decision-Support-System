from rest_framework import permissions


class MonitoringScopedPermission(permissions.BasePermission):
   
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role in ('admin', 'regional_manager'):
            return True
        if user.role == 'national_viewer':
            return request.method in permissions.SAFE_METHODS
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == 'admin':
            return True
        if user.role == 'regional_manager':
            return obj.project.region_id == user.region_id
        if user.role == 'national_viewer':
            return request.method in permissions.SAFE_METHODS
        return False


class AlertPermission(permissions.BasePermission):
    """Alerts are written by the scheduled job (admin identity) — everyone else reads only."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user.role == 'admin'

    def has_object_permission(self, request, view, obj):
        user = request.user
        if request.method in permissions.SAFE_METHODS:
            if user.role == 'regional_manager':
                return obj.project.region_id == user.region_id
            return True
        return user.role == 'admin'