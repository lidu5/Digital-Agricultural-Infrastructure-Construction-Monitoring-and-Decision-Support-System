"""
accounts/models.py

People and organizations. Both the projects app (via Issue.raised_by,
Document.uploaded_by) and the contracts app (Contract.contractor_org)
need these, so they live in their own app rather than inside either.
"""

import uuid
from django.db import models
from django.contrib.auth.hashers import make_password
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin, BaseUserManager

from geography.models import Region


class OrganizationType(models.TextChoices):
    CONTRACTOR = 'contractor', 'Contractor'
    CONSULTANT = 'consultant', 'Consultant'
    GOVERNMENT = 'government', 'Government Bureau'
    NGO = 'ngo', 'NGO'
    OTHER = 'other', 'Other'


class Organization(models.Model):
    """
    Unifies contractors, consultants, government bureaus, and any other
    party that can be linked to a contract or made responsible for an
    issue. org_type distinguishes the role rather than splitting into
    separate contractor/consultant tables.
    """
    org_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    org_type = models.CharField(max_length=20, choices=OrganizationType.choices)
    contact_person = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    registration_no = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_org_type_display()})"


class UserRole(models.TextChoices):
    REGIONAL_MANAGER = 'regional_manager', 'Regional Bureau Manager'
    NATIONAL_VIEWER = 'national_viewer', 'National Viewer'
    ADMIN = 'admin', 'System Administrator'


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.password = make_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model. Only Regional Bureau Manager is region-scoped —
    National Viewer and System Administrator see/manage everything, so
    'region' is nullable and only meaningful for that one role.
    """
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=UserRole.choices)
    region = models.ForeignKey(
        Region, on_delete=models.PROTECT, null=True, blank=True,
        related_name='users',
        help_text="Only applies to Regional Bureau Manager; leave blank for National Viewer / Admin."
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # required for Django admin login
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name', 'role']

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.role == UserRole.REGIONAL_MANAGER and not self.region_id:
            raise ValidationError("Regional Bureau Manager must have a region assigned.")
