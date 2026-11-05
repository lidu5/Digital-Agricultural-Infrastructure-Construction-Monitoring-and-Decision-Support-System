"""
audit/mixins.py

AuditLogMixin — add to any DRF ModelViewSet to get automatic field-level
audit logging on create, update (PUT/PATCH), and destroy.

Usage:
    class MyViewSet(AuditLogMixin, viewsets.ModelViewSet):
        ...

Fields that are excluded from diff (noisy / always changing):
    updated_at, created_at
"""

from decimal import Decimal
from django.contrib.contenttypes.models import ContentType

from .models import AuditLog, AuditAction

_SKIP_FIELDS = frozenset(['updated_at', 'created_at'])


def _serialise(value):
    """Convert model field values to JSON-safe types."""
    if isinstance(value, Decimal):
        return str(value)
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    if hasattr(value, 'pk'):
        return str(value.pk)
    if value is None or isinstance(value, (bool, int, float, str, list, dict)):
        return value
    return str(value)


def _snapshot(instance):
    """Return a dict of field_name -> serialised value for a model instance."""
    result = {}
    for field in instance._meta.concrete_fields:
        if field.name in _SKIP_FIELDS:
            continue
        result[field.name] = _serialise(field.value_from_object(instance))
    return result


def _diff(old_snap, new_snap):
    """Return only the fields that changed, with old and new values."""
    changes = {}
    all_keys = set(old_snap) | set(new_snap)
    for key in all_keys:
        old_val = old_snap.get(key)
        new_val = new_snap.get(key)
        if old_val != new_val:
            changes[key] = {'old': old_val, 'new': new_val}
    return changes


def _write_log(request, action, instance, changed_fields):
    user = request.user if request.user.is_authenticated else None
    ct = ContentType.objects.get_for_model(instance.__class__)
    AuditLog.objects.create(
        actor=user,
        actor_email=user.email if user else '',
        action=action,
        content_type=ct,
        object_id=str(instance.pk),
        object_repr=str(instance)[:255],
        changed_fields=changed_fields,
    )


class AuditLogMixin:
    """
    Mixin for DRF ModelViewSet subclasses.
    Override _audit_skip_fields on the viewset to exclude additional fields.
    """

    _audit_skip_fields: frozenset = frozenset()

    def perform_create(self, serializer):
        instance = serializer.save()
        snap = _snapshot(instance)
        for f in self._audit_skip_fields:
            snap.pop(f, None)
        _write_log(self.request, AuditAction.CREATE, instance, snap)

    def perform_update(self, serializer):
        old_snap = _snapshot(serializer.instance)
        instance = serializer.save()
        new_snap = _snapshot(instance)
        diff = _diff(old_snap, new_snap)
        for f in self._audit_skip_fields:
            diff.pop(f, None)
        if diff:
            _write_log(self.request, AuditAction.UPDATE, instance, diff)

    def perform_destroy(self, instance):
        snap = _snapshot(instance)
        for f in self._audit_skip_fields:
            snap.pop(f, None)
        _write_log(self.request, AuditAction.DELETE, instance, snap)
        instance.delete()
