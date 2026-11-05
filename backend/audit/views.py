from rest_framework import viewsets, permissions, filters
from rest_framework.pagination import PageNumberPagination

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AuditLogPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['actor_email', 'object_repr']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        user = self.request.user
        qs = AuditLog.objects.select_related('actor', 'content_type').all()
        if user.role != 'admin':
            qs = qs.filter(actor=user)
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        model = self.request.query_params.get('model')
        if model:
            qs = qs.filter(content_type__model=model)
        return qs
