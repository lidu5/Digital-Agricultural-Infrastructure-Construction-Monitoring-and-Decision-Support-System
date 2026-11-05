from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'actor_email', 'action', 'content_type', 'object_repr')
    list_filter = ('action', 'content_type')
    search_fields = ('actor_email', 'object_repr', 'object_id')
    readonly_fields = ('id', 'actor', 'actor_email', 'action', 'content_type',
                       'object_id', 'object_repr', 'changed_fields', 'timestamp')
    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
