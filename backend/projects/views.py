from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Project, ProjectMilestone, MilestoneType
from .serializers import ProjectSerializer, ProjectMilestoneSerializer, MilestoneTypeSerializer
from .permissions import ProjectPermission


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [ProjectPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Project.objects.all()
        if user.role == 'regional_manager':
            return qs.filter(region=user.region)
        return qs  # admin and national_viewer see everything

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'regional_manager':
            # Force the new project into the manager's own region,
            # regardless of what region was sent in the request body.
            serializer.save(region=user.region)
        else:
            serializer.save()

    def partial_update(self, request, *args, **kwargs):
        user = request.user
        if user.role == 'national_viewer':
            allowed_fields = {'priority_level'}
            submitted_fields = set(request.data.keys())
            if not submitted_fields.issubset(allowed_fields):
                raise PermissionDenied(
                    "National Viewer can only update 'priority_level'."
                )
        return super().partial_update(request, *args, **kwargs)


class MilestoneTypeViewSet(viewsets.ModelViewSet):
    queryset = MilestoneType.objects.all()
    serializer_class = MilestoneTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProjectMilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ProjectMilestone.objects.all()
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs