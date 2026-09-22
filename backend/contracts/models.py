"""
contracts/models.py

Contract and everything that belongs to a contract over its life
(variation orders, extensions of time, payment certificates, claims).
References projects (Contract.project) and accounts (contractor/
consultant orgs).
"""
from django.db import models


class Contract(models.Model):
    contract_id = models.BigAutoField(primary_key=True)

    # Foreign keys
    project = models.ForeignKey(
        "Project",
        on_delete=models.PROTECT,
        related_name="contracts",
        db_column="project_id",
    )

    contractor_org = models.ForeignKey(
        "Organization",
        on_delete=models.PROTECT,
        related_name="contracts_as_contractor",
        db_column="contractor_org_id",
    )

    consultant_org = models.ForeignKey(
        "Organization",
        on_delete=models.PROTECT,
        related_name="contracts_as_consultant",
        db_column="consultant_org_id",
    )

    # Contract information
    contract_number = models.CharField(max_length=100)

    contract_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2
    )

    revised_contract_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True
    )

    contract_signing_date = models.DateField(
        null=True,
        blank=True
    )

    commencement_date = models.DateField(
        null=True,
        blank=True
    )

    original_completion_date = models.DateField(
        null=True,
        blank=True
    )

    revised_completion_date = models.DateField(
        null=True,
        blank=True
    )

    contract_duration_months = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    # Security and payment
    performance_security_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True
    )

    performance_security_expiry = models.DateField(
        null=True,
        blank=True
    )

    advance_payment_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True
    )

    advance_payment_recovered = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True
    )

    # Status
    current_status = models.CharField(
        max_length=50,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "contracts"

    def __str__(self):
        return self.contract_number


#variation order

class VariationOrder(models.Model):
    vo_id = models.BigAutoField(primary_key=True)

    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name="variation_orders",
        db_column="contract_id",
    )

    vo_number = models.CharField(max_length=100)

    value = models.DecimalField(
        max_digits=18,
        decimal_places=2
    )

    approved_date = models.DateField(
        null=True,
        blank=True
    )

    description = models.TextField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = "variation_orders"

    def __str__(self):
        return self.vo_number


#extension of time

class ExtensionOfTime(models.Model):
    eot_id = models.BigAutoField(primary_key=True)

    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name="extensions_of_time",
        db_column="contract_id",
    )

    eot_number = models.CharField(max_length=100)

    approved_days = models.PositiveIntegerField()

    approved_date = models.DateField(
        null=True,
        blank=True
    )

    reason = models.TextField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = "extensions_of_time"

    def __str__(self):
        return self.eot_number
#IPC
class IPC(models.Model):
    ipc_id = models.BigAutoField(primary_key=True)

    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name="ipcs",
        db_column="contract_id",
    )

    ipc_number = models.CharField(max_length=100)

    ipc_date = models.DateField()

    certified_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2
    )

    paid_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0
    )

    retention_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "ipcs"

    def __str__(self):
        return self.ipc_number

#claims

class Claim(models.Model):
    claim_id = models.BigAutoField(primary_key=True)

    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name="claims",
        db_column="contract_id",
    )

    claim_date = models.DateField()

    claim_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2
    )

    description = models.TextField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=50
    )

    class Meta:
        db_table = "claims"

    def __str__(self):
        return f"Claim {self.claim_id}"


import uuid
from django.db import models

from projects.models import Project
from accounts.models import Organization, OrganizationType


class ContractStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    SUSPENDED = 'suspended', 'Suspended'
    COMPLETED = 'completed', 'Completed'
    TERMINATED = 'terminated', 'Terminated'


class Contract(models.Model):
    contract_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='contracts')
    contract_number = models.CharField(max_length=50, unique=True)

    contractor_org = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name='contracts_as_contractor',
        limit_choices_to={'org_type': OrganizationType.CONTRACTOR}
    )
    consultant_org = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name='contracts_as_consultant',
        null=True, blank=True,
        limit_choices_to={'org_type': OrganizationType.CONSULTANT}
    )

    contract_amount = models.DecimalField(max_digits=16, decimal_places=2)
    revised_contract_amount = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)

    contract_signing_date = models.DateField(null=True, blank=True)
    commencement_date = models.DateField(null=True, blank=True)
    original_completion_date = models.DateField(null=True, blank=True)
    revised_completion_date = models.DateField(null=True, blank=True)
    contract_duration_months = models.PositiveIntegerField(null=True, blank=True)

    performance_security_amount = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    performance_security_expiry = models.DateField(null=True, blank=True)

    advance_payment_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    advance_payment_recovered = models.DecimalField(max_digits=16, decimal_places=2, default=0)

    current_status = models.CharField(max_length=20, choices=ContractStatus.choices, default=ContractStatus.ACTIVE)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['current_status'])]

    def __str__(self):
        return self.contract_number


class VariationOrder(models.Model):
    vo_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='variation_orders')
    vo_number = models.CharField(max_length=20)  # VO1, VO2, ...
    value = models.DecimalField(max_digits=16, decimal_places=2)
    approved_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ('contract', 'vo_number')

    def __str__(self):
        return f"{self.contract.contract_number} — {self.vo_number}"


class ExtensionOfTime(models.Model):
    eot_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='extensions_of_time')
    eot_number = models.CharField(max_length=20)  # EoT1, EoT2, ...
    approved_days = models.PositiveIntegerField()
    approved_date = models.DateField(null=True, blank=True)
    reason = models.TextField(blank=True)

    class Meta:
        unique_together = ('contract', 'eot_number')

    def __str__(self):
        return f"{self.contract.contract_number} — {self.eot_number}"


class IPC(models.Model):
    """Interim Payment Certificate — one row per certificate/event, not a running total."""
    ipc_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='ipcs')
    ipc_number = models.CharField(max_length=20)
    ipc_date = models.DateField(null=True, blank=True)
    certified_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    retention_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('contract', 'ipc_number')
        ordering = ['contract', 'ipc_number']

    def __str__(self):
        return f"{self.contract.contract_number} — {self.ipc_number}"


class ClaimStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    UNDER_REVIEW = 'under_review', 'Under review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class Claim(models.Model):
    claim_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='claims')
    claim_date = models.DateField(null=True, blank=True)
    claim_amount = models.DecimalField(max_digits=16, decimal_places=2)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=ClaimStatus.choices, default=ClaimStatus.OPEN)

    def __str__(self):
        return f"{self.contract.contract_number} — claim {self.claim_id}"
