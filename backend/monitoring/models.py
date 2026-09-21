"""
monitoring/models.py

Everything that tracks or evidences a project's progress over time:
progress records, the problem/issue log, document evidence, and
auto-generated alerts. This is the "highest level" app — it references
projects, contracts, and accounts, but nothing references back into it,
so it sits last in INSTALLED_APPS with no circular-import risk.
"""

import uuid
from django.db import models

from projects.models import Project
from contracts.models import Contract
from accounts.models import User, Organization


# ============================================================================
# Lookups that belong conceptually to monitoring (not shared elsewhere)
# ============================================================================

class ProblemCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class DocumentType(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class AlertType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


# ============================================================================
# PROGRESS RECORDS
# ============================================================================

class ProgressRecord(models.Model):
    """
    One row per project per reporting period. Percentages are computed
    properties rather than DB-generated columns — see the build guide's
    note on why (Django doesn't manage GENERATED ALWAYS columns cleanly).
    """
    record_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='progress_records')
    contract = models.ForeignKey(Contract, on_delete=models.SET_NULL, null=True, blank=True, related_name='progress_records')
    record_date = models.DateField()

    actual_quantity_completed = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    total_contract_quantity = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    certified_amount = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    contract_amount_snapshot = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)

    elapsed_duration_days = models.PositiveIntegerField(null=True, blank=True)
    total_duration_days = models.PositiveIntegerField(null=True, blank=True)

    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='progress_records')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'record_date')
        ordering = ['-record_date']
        indexes = [models.Index(fields=['project', '-record_date'])]

    @property
    def physical_progress_pct(self):
        if self.total_contract_quantity:
            return round(self.actual_quantity_completed / self.total_contract_quantity * 100, 2)
        return 0

    @property
    def financial_progress_pct(self):
        if self.contract_amount_snapshot:
            return round(self.certified_amount / self.contract_amount_snapshot * 100, 2)
        return 0

    @property
    def time_progress_pct(self):
        if self.total_duration_days:
            return round(self.elapsed_duration_days / self.total_duration_days * 100, 2)
        return 0

    def __str__(self):
        return f"{self.project.project_code} — {self.record_date}"


# ============================================================================
# ISSUES
# ============================================================================

class IssueStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    IN_PROGRESS = 'in_progress', 'In progress'
    RESOLVED = 'resolved', 'Resolved'
    ESCALATED = 'escalated', 'Escalated'


class Issue(models.Model):
    """
    The Problem -> Cause -> Impact -> Responsible party -> Action ->
    Deadline -> Status chain from the source document. Also doubles as
    the audit trail for Project.technical_support_required — when that
    flag is set, a row here is created with responsible_org pointing at
    whichever body should handle it.
    """
    issue_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='issues')
    problem_category = models.ForeignKey(ProblemCategory, on_delete=models.PROTECT, related_name='issues')

    problem_description = models.TextField()
    cause = models.TextField(blank=True)
    impact = models.TextField(blank=True)
    responsible_org = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='responsible_issues'
    )
    required_action = models.TextField(blank=True)
    deadline = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=IssueStatus.choices, default=IssueStatus.OPEN)

    # True only for the auto-generated issue tied to a technical_support_required flag.
    is_technical_support_request = models.BooleanField(default=False)

    raised_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='issues_raised')
    raised_date = models.DateField(auto_now_add=True)
    resolved_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.project.project_code} — {self.problem_category.name}"

    def save(self, *args, **kwargs):
        """Keep Project.technical_support_required in sync with this issue's status."""
        super().save(*args, **kwargs)
        if self.is_technical_support_request:
            should_be_flagged = self.status in (IssueStatus.OPEN, IssueStatus.IN_PROGRESS, IssueStatus.ESCALATED)
            if self.project.technical_support_required != should_be_flagged:
                self.project.technical_support_required = should_be_flagged
                self.project.save(update_fields=['technical_support_required'])


# ============================================================================
# DOCUMENTS
# ============================================================================

class Document(models.Model):
    document_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='documents')
    document_type = models.ForeignKey(DocumentType, on_delete=models.PROTECT, related_name='documents')
    file_url = models.URLField(max_length=500)
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='documents_uploaded')
    upload_date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-upload_date']
        indexes = [models.Index(fields=['project', 'document_type'])]

    def __str__(self):
        return f"{self.project.project_code} — {self.document_type.name}"


# ============================================================================
# ALERTS
# ============================================================================

class AlertSeverity(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    CRITICAL = 'critical', 'Critical'


class AlertStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    ACKNOWLEDGED = 'acknowledged', 'Acknowledged'
    RESOLVED = 'resolved', 'Resolved'


class Alert(models.Model):
    """
    Written by a scheduled job (a management command run periodically),
    not by users directly — evaluates contracts and progress_records
    against thresholds (expiry dates, underperformance, etc.).
    """
    alert_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='alerts')
    contract = models.ForeignKey(Contract, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    alert_type = models.ForeignKey(AlertType, on_delete=models.PROTECT, related_name='alerts')

    severity = models.CharField(max_length=10, choices=AlertSeverity.choices, default=AlertSeverity.MEDIUM)
    status = models.CharField(max_length=15, choices=AlertStatus.choices, default=AlertStatus.OPEN)

    triggered_date = models.DateField(auto_now_add=True)
    resolved_date = models.DateField(null=True, blank=True)
    details = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-triggered_date']
        indexes = [models.Index(fields=['project', 'status'])]

    def __str__(self):
        return f"{self.project.project_code} — {self.alert_type.name}"
