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


