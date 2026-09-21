"""
geography/models.py

Location hierarchy (Region -> Zone -> Woreda -> Kebele) and the
classification lookup tables (ProjectType, WaterSource, Crop, etc.) live
here because both the projects app and the accounts app (User.region)
need to reference them — putting them in either of those would create a
circular dependency.
"""

from django.db import models


# ============================================================================
# LOCATION HIERARCHY
# ============================================================================

class Region(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Zone(models.Model):
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name='zones')
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ('region', 'name')
        ordering = ['region', 'name']

    def __str__(self):
        return f"{self.name} ({self.region.name})"


class Woreda(models.Model):
    zone = models.ForeignKey(Zone, on_delete=models.PROTECT, related_name='woredas')
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ('zone', 'name')
        ordering = ['zone', 'name']

    def __str__(self):
        return f"{self.name} ({self.zone.name})"


class Kebele(models.Model):
    woreda = models.ForeignKey(Woreda, on_delete=models.PROTECT, related_name='kebeles')
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ('woreda', 'name')
        ordering = ['woreda', 'name']

    def __str__(self):
        return self.name


# ============================================================================
# CLASSIFICATION LOOKUPS
# ============================================================================

class NamedLookup(models.Model):
    """Abstract base for simple 'id + name' lookup tables."""
    name = models.CharField(max_length=150, unique=True)

    class Meta:
        abstract = True
        ordering = ['name']

    def __str__(self):
        return self.name


class ProjectType(NamedLookup):
    pass


class WaterSource(NamedLookup):
    pass


class IrrigationTechnology(NamedLookup):
    pass


class IrrigationSystem(NamedLookup):
    pass


class ProjectCategory(NamedLookup):
    pass


class FinancingSource(NamedLookup):
    pass


class Crop(NamedLookup):
    pass
