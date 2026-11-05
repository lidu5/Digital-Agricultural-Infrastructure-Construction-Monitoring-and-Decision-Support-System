"""
audit/models.py

Generic field-level audit log. One row per create/update/delete action
on any tracked model. Uses Django's ContentTypes framework so a single
table covers every app without coupling.
"""

import uuid
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from django.conf import settings


class AuditAction(models.TextChoices):
    CREATE = 'create', 'Create'
    UPDATE = 'update', 'Update'
    DELETE = 'delete', 'Delete'


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='audit_logs',
    )
    actor_email = models.EmailField(blank=True)  # snapshot in case user is later deleted

    # What action
    action = models.CharField(max_length=10, choices=AuditAction.choices)

    # Which object (generic FK)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=100)
    content_object = GenericForeignKey('content_type', 'object_id')
    object_repr = models.CharField(max_length=255, blank=True)  # str() snapshot

    # Field-level diff: {"field_name": {"old": ..., "new": ...}, ...}
    # Empty dict for CREATE (full new values) or DELETE (full old values).
    changed_fields = models.JSONField(default=dict)

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['actor']),
        ]

    def __str__(self):
        actor = self.actor_email or 'system'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {actor} {self.action} {self.object_repr}"
