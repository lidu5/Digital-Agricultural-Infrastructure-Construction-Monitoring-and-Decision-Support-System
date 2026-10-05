"""
contracts/signals.py

Keeps Contract.revised_contract_amount and Contract.revised_completion_date
in sync with their approved VariationOrders / ExtensionsOfTime, instead of
relying on someone to manually edit the contract after adding one.

Only VOs/EoTs with an approved_date set count towards the revision — a
VO/EoT with no approved_date yet is still pending and shouldn't move the
contract amount or date.
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import VariationOrder, ExtensionOfTime


def recalculate_revised_amount(contract):
    approved_total = contract.variation_orders.filter(
        approved_date__isnull=False
    ).aggregate(total=Sum('value'))['total'] or Decimal('0')

    contract.revised_contract_amount = contract.contract_amount + approved_total
    contract.save(update_fields=['revised_contract_amount'])


def recalculate_revised_completion_date(contract):
    if not contract.original_completion_date:
        return

    approved_days = contract.extensions_of_time.filter(
        approved_date__isnull=False
    ).aggregate(total=Sum('approved_days'))['total'] or 0

    contract.revised_completion_date = contract.original_completion_date + timedelta(days=approved_days)
    contract.save(update_fields=['revised_completion_date'])


@receiver(post_save, sender=VariationOrder)
def variation_order_saved(sender, instance, **kwargs):
    recalculate_revised_amount(instance.contract)


@receiver(post_delete, sender=VariationOrder)
def variation_order_deleted(sender, instance, **kwargs):
    recalculate_revised_amount(instance.contract)


@receiver(post_save, sender=ExtensionOfTime)
def extension_of_time_saved(sender, instance, **kwargs):
    recalculate_revised_completion_date(instance.contract)


@receiver(post_delete, sender=ExtensionOfTime)
def extension_of_time_deleted(sender, instance, **kwargs):
    recalculate_revised_completion_date(instance.contract)
