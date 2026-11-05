"""
contracts/models.py

Contract and everything that belongs to a contract over its life
(variation orders, extensions of time, payment certificates, claims).
References projects (Contract.project) and accounts (contractor/
consultant orgs).
"""

import uuid
from decimal import Decimal
from django.db import models

from projects.models import Project
from accounts.models import Organization, OrganizationType, User


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

    contract_quantity = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    quantity_unit = models.CharField(max_length=30, blank=True)

    contract_signing_date = models.DateField(null=True, blank=True)
    commencement_date = models.DateField(null=True, blank=True)
    original_completion_date = models.DateField(null=True, blank=True)
    revised_completion_date = models.DateField(null=True, blank=True)
    contract_duration_months = models.PositiveIntegerField(null=True, blank=True)

    performance_security_amount = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    performance_security_expiry = models.DateField(null=True, blank=True)

    retention_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text='Retention percentage (e.g., 5.00 means 5%).'
    )
    advance_payment_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    advance_payment_recovery_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text='Advance payment recovery percentage per IPC (e.g., 20.00 means 20%).'
    )

    current_status = models.CharField(max_length=20, choices=ContractStatus.choices, default=ContractStatus.ACTIVE)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['current_status'])]

    def __str__(self):
        return self.contract_number

    @property
    def advance_payment_recovered(self):
        result = self.ipcs.aggregate(total=models.Sum('advance_deduction'))['total']
        return result or Decimal('0')

    def approved_vo_total(self, exclude_vo=None):
        qs = self.variation_orders.filter(approved_date__isnull=False)
        if exclude_vo is not None:
            qs = qs.exclude(pk=exclude_vo)
        return qs.aggregate(total=models.Sum('value'))['total'] or Decimal('0')

    def current_value(self):
        return (self.contract_amount or Decimal('0')) + self.approved_vo_total()

    def certified_total(self, exclude_ipc=None):
        qs = self.ipcs.all()
        if exclude_ipc is not None:
            qs = qs.exclude(pk=exclude_ipc)
        return qs.aggregate(total=models.Sum('certified_amount'))['total'] or Decimal('0')

    def progress_snapshot(self, record_date=None):
        """
        Roll up measured contract data (BOQ quantities, certified IPCs,
        contract dates) into project-level progress figures.

        Used by the monitoring ProgressRecord roll-up so the reported
        record reflects measured contract detail rather than a loose
        manual estimate.
        """
        items = list(self.boq_items.all())
        physical_pct = (
            sum((i.physical_progress_pct for i in items), Decimal('0'))
            if items else None
        )

        completion = self.revised_completion_date or self.original_completion_date
        total_days = None
        if self.commencement_date and completion:
            total_days = max((completion - self.commencement_date).days, 0)
        elif self.contract_duration_months:
            total_days = round(self.contract_duration_months * 30.44)

        elapsed = None
        if self.commencement_date and record_date:
            elapsed = max((record_date - self.commencement_date).days, 0)

        return {
            'physical_pct': physical_pct,
            'certified_amount': self.certified_total(),
            'contract_amount': self.current_value(),
            'elapsed_duration_days': elapsed,
            'total_duration_days': total_days,
        }


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
    advance_deduction = models.DecimalField(max_digits=16, decimal_places=2, default=0)
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
    requested_date = models.DateField(null=True, blank=True)
    approved_date = models.DateField(null=True, blank=True)
    claim_amount = models.DecimalField(max_digits=16, decimal_places=2)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=ClaimStatus.choices, default=ClaimStatus.OPEN)
    request_letter = models.FileField(upload_to='claims/request_letters/', null=True, blank=True)
    approval_letter = models.FileField(upload_to='claims/approval_letters/', null=True, blank=True)

    def __str__(self):
        return f"{self.contract.contract_number} — claim {self.claim_id}"


# ============================================================================
# BILL OF QUANTITIES
# ============================================================================

class BOQSection(models.Model):
    """
    A grouping of BOQ items within a contract.  Sections may be nested by
    pointing parent_section at another section on the same contract.
    """
    section_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='boq_sections')
    parent_section = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='child_sections'
    )
    code = models.CharField(max_length=30)
    title = models.CharField(max_length=255)

    class Meta:
        unique_together = ('contract', 'code')
        ordering = ['code']

    def __str__(self):
        return f"{self.contract.contract_number} — {self.code}: {self.title}"


class BOQItem(models.Model):
    """
    One line in the Bill of Quantities.  total_price_etb is entered by the
    user (lump-sum items may differ from quantity × unit_rate).
    weight_pct is contract-global: all items on the same contract must sum
    to exactly 100 (enforced by the serializer — ≤ 100 on each save).
    """
    item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(BOQSection, on_delete=models.CASCADE, related_name='items')
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='boq_items')
    item_no = models.CharField(max_length=30)
    description = models.TextField()
    unit = models.CharField(max_length=30)
    quantity = models.DecimalField(max_digits=14, decimal_places=4)
    unit_rate_etb = models.DecimalField(max_digits=16, decimal_places=2)
    total_price_etb = models.DecimalField(
        max_digits=18, decimal_places=2,
        help_text='Enter freely; need not equal quantity × unit_rate.'
    )
    weight_pct = models.DecimalField(
        max_digits=7, decimal_places=4,
        help_text='This item\'s weight as a percentage of the whole contract (all items sum to 100).'
    )

    class Meta:
        unique_together = ('contract', 'item_no')
        ordering = ['item_no']

    def __str__(self):
        return f"{self.contract.contract_number} — {self.item_no}"

    @property
    def cumulative_qty_completed(self):
        latest = self.physical_progress.order_by('-record_date').first()
        return latest.actual_qty_completed if latest else Decimal('0')

    @property
    def qty_completion_pct(self):
        if not self.quantity:
            return Decimal('0')
        return round(self.cumulative_qty_completed / self.quantity * 100, 4)

    @property
    def physical_progress_pct(self):
        return round(self.qty_completion_pct * self.weight_pct / 100, 4)

    @property
    def cumulative_certified_etb(self):
        result = self.ipc_line_items.aggregate(total=models.Sum('certified_amount_etb'))['total']
        return result or Decimal('0')

    @property
    def financial_progress_pct(self):
        if not self.total_price_etb:
            return Decimal('0')
        return round(self.cumulative_certified_etb / self.total_price_etb * 100, 4)


class PhysicalProgress(models.Model):
    """
    One reading per BOQ item per calendar date.  The latest record for each
    item is treated as the current progress value; earlier records form the
    history.
    """
    progress_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    boq_item = models.ForeignKey(BOQItem, on_delete=models.CASCADE, related_name='physical_progress')
    record_date = models.DateField()
    actual_qty_completed = models.DecimalField(max_digits=14, decimal_places=4)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='physical_progress_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('boq_item', 'record_date')
        ordering = ['-record_date']

    def __str__(self):
        return f"{self.boq_item} — {self.record_date}"

    @property
    def qty_completion_pct(self):
        qty = self.boq_item.quantity
        if not qty:
            return Decimal('0')
        return round(self.actual_qty_completed / qty * 100, 4)

    @property
    def physical_progress_pct(self):
        return round(self.qty_completion_pct * self.boq_item.weight_pct / 100, 4)


class IPCLineItem(models.Model):
    """
    One certified-amount entry per BOQ item per IPC round.
    Cumulative financial progress = Σ certified_amount_etb / total_price_etb × 100.
    """
    line_item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    boq_item = models.ForeignKey(BOQItem, on_delete=models.CASCADE, related_name='ipc_line_items')
    ipc = models.ForeignKey(IPC, on_delete=models.CASCADE, related_name='line_items')
    certified_amount_etb = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('boq_item', 'ipc')
        ordering = ['ipc__ipc_number']

    def __str__(self):
        return f"{self.boq_item} — IPC {self.ipc.ipc_number}"

    @property
    def financial_progress_pct(self):
        price = self.boq_item.total_price_etb
        if not price:
            return Decimal('0')
        return round(self.certified_amount_etb / price * 100, 4)
