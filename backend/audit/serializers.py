from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True, default='')
    model_name = serializers.CharField(source='content_type.model', read_only=True)
    app_label = serializers.CharField(source='content_type.app_label', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'actor_email', 'actor_name',
            'action', 'app_label', 'model_name',
            'object_id', 'object_repr',
            'changed_fields', 'timestamp',
        ]
