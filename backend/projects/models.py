"""
projects/models.py

The core project record and everything that belongs directly to a
project (crops planted, milestone progress). References geography for
location/classification, and accounts is referenced *from* other apps
(contracts, monitoring) back to Project — not the other way around, so
there's no circular import.
"""

import uuid
from django.contrib.gis.db import models as gis_models
from django.db import models

from geography.models import (
    Region, Zone, Woreda, Kebele,
    ProjectType, WaterSource, IrrigationTechnology, IrrigationSystem,
    ProjectCategory, FinancingSource, Crop,
)


class StatusFlag(models.TextChoices):
    ON_TRACK = 'on_track', 'On track'
    DELAYED = 'delayed', 'Delayed'
    CRITICAL = 'critical', 'Critical'
    COMPLETED = 'completed', 'Completed'


class PriorityLevel(models.TextChoices):
    NORMAL = 'normal', 'Normal'
    HIGH = 'high', 'High'
    CRITICAL = 'critical', 'Critical'


class Project(models.Model):
    project_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_code = models.CharField(max_length=30, unique=True)
    project_name = models.CharField(max_length=255)

    # Location — denormalized FKs at every level (not just kebele) so
    # queries can filter by any level without joining all the way down.
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name='projects')
    zone = models.ForeignKey(Zone, on_delete=models.PROTECT, related_name='projects')
    woreda = models.ForeignKey(Woreda, on_delete=models.PROTECT, related_name='projects')
    kebele = models.ForeignKey(Kebele, on_delete=models.SET_NULL, null=True, blank=True, related_name='projects')

    gps_location = gis_models.PointField(geography=True, null=True, blank=True)
    basin = models.CharField(max_length=100, blank=True)
    sub_basin = models.CharField(max_length=100, blank=True)

    project_type = models.ForeignKey(ProjectType, on_delete=models.PROTECT, related_name='projects')
    water_source = models.ForeignKey(WaterSource, on_delete=models.PROTECT, related_name='projects')
    irrigation_technology = models.ForeignKey(IrrigationTechnology, on_delete=models.PROTECT, related_name='projects')
    irrigation_system = models.ForeignKey(IrrigationSystem, on_delete=models.PROTECT, related_name='projects')
    category = models.ForeignKey(ProjectCategory, on_delete=models.PROTECT, related_name='projects')
    financing_source = models.ForeignKey(FinancingSource, on_delete=models.PROTECT, related_name='projects')

    crops = models.ManyToManyField(Crop, through='ProjectCrop', related_name='projects')

    designed_irrigable_area_ha = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    target_beneficiaries_thh = models.PositiveIntegerField(null=True, blank=True)
    target_beneficiaries_male = models.PositiveIntegerField(null=True, blank=True)
    target_beneficiaries_female = models.PositiveIntegerField(null=True, blank=True)

    # Denormalized rollups — refreshed from progress_records (monitoring
    # app); fast for list/map views instead of recomputing on every request.
    physical_status_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    financial_status_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overall_status_flag = models.CharField(max_length=20, choices=StatusFlag.choices, default=StatusFlag.ON_TRACK)
    priority_level = models.CharField(max_length=20, choices=PriorityLevel.choices, default=PriorityLevel.NORMAL)

    # Technical support workflow — the structured "why" lives in
    # monitoring.Issue (responsible_org, cause, deadline, etc.); this
    # flag is just the trigger/visibility switch, kept in sync by
    # Issue.save() in the monitoring app.
    technical_support_required = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['region']),
            models.Index(fields=['overall_status_flag']),
        ]

    def __str__(self):
        return f"{self.project_code} — {self.project_name}"


class ProjectCrop(models.Model):
    """Junction table resolving the multivalued 'main crops' attribute."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    crop = models.ForeignKey(Crop, on_delete=models.PROTECT)

    class Meta:
        unique_together = ('project', 'crop')


class MilestoneType(models.Model):
    """The 14 fixed construction stages, in a fixed order."""
    name = models.CharField(max_length=100, unique=True)
    sequence_order = models.PositiveSmallIntegerField(unique=True)

    class Meta:
        ordering = ['sequence_order']

    def __str__(self):
        return f"{self.sequence_order}. {self.name}"


class MilestoneStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    IN_PROGRESS = 'in_progress', 'In progress'
    COMPLETED = 'completed', 'Completed'
    DELAYED = 'delayed', 'Delayed'


class ProjectMilestone(models.Model):
    """Junction table: one row per project per milestone stage."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    milestone_type = models.ForeignKey(MilestoneType, on_delete=models.PROTECT)
    planned_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=MilestoneStatus.choices, default=MilestoneStatus.PENDING)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('project', 'milestone_type')
        ordering = ['project', 'milestone_type__sequence_order']

    def __str__(self):
        return f"{self.project.project_code} — {self.milestone_type.name}"
