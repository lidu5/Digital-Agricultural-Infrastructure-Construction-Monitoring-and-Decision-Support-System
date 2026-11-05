from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from audit.mixins import AuditLogMixin, AuditAction, _snapshot, _write_log
from .models import Program, Project, ProjectMilestone, MilestoneType
from .serializers import ProgramSerializer, ProjectSerializer, ProjectMilestoneSerializer, MilestoneTypeSerializer
from .permissions import ProgramPermission, ProjectPermission


class ProgramViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    permission_classes = [ProgramPermission]


class ProjectViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [ProjectPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Project.objects.all()
        if user.role == 'regional_manager':
            qs = qs.filter(region=user.region)
        params = self.request.query_params
        if params.get('region'):
            qs = qs.filter(region_id=params['region'])
        if params.get('program'):
            qs = qs.filter(program_id=params['program'])
        if params.get('status'):
            qs = qs.filter(overall_status_flag=params['status'])
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'regional_manager':
            instance = serializer.save(region=user.region)
        else:
            instance = serializer.save()
        _write_log(self.request, AuditAction.CREATE, instance, _snapshot(instance))

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


class MilestoneTypeViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = MilestoneType.objects.all()
    serializer_class = MilestoneTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProjectMilestoneViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = ProjectMilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ProjectMilestone.objects.all()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs