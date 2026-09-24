from rest_framework import viewsets, permissions
from .models import (
    ProblemCategory, DocumentType, AlertType,
    ProgressRecord, Issue, Document, Alert,
)
from .serializers import (
    ProblemCategorySerializer, DocumentTypeSerializer, AlertTypeSerializer,
    ProgressRecordSerializer, IssueSerializer, DocumentSerializer, AlertSerializer,
)
from .permissions import MonitoringScopedPermission, AlertPermission


# Lookup tables — any authenticated user can read/write these for now
class ProblemCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProblemCategory.objects.all()
    serializer_class = ProblemCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class DocumentTypeViewSet(viewsets.ModelViewSet):
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class AlertTypeViewSet(viewsets.ModelViewSet):
    queryset = AlertType.objects.all()
    serializer_class = AlertTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProgressRecordViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressRecordSerializer
    permission_classes = [MonitoringScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = ProgressRecord.objects.all()
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class IssueViewSet(viewsets.ModelViewSet):
    serializer_class = IssueSerializer
    permission_classes = [MonitoringScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Issue.objects.all()
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs

    def perform_create(self, serializer):
        serializer.save(raised_by=self.request.user)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [MonitoringScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.all()
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [AlertPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Alert.objects.all()
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs