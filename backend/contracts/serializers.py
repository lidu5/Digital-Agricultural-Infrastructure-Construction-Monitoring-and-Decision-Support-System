from datetime import date
from decimal import Decimal

from rest_framework import serializers

from django.db.models import Sum

from .models import (
    Contract,
    VariationOrder,
    ExtensionOfTime,
    IPC,
    Claim,
    BOQSection,
    BOQItem,
    PhysicalProgress,
    IPCLineItem,
)
from .signals import recalculate_revised_amount


def _add_months(d, months):
    """Return d + months calendar months (same day-of-month logic as JS Date.setMonth)."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    import calendar
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(d.day, last_day))


def _value(serializer, attrs, name):
    if name in attrs:
        return attrs[name]
    return getattr(serializer.instance, name, None)


def _money(amount):
    return f"{amount:,.2f}"

MAX_LETTER_SIZE_MB = 10


def check_dates(requested, approved):
    """Approved date cannot be earlier than the requested date."""
    if requested and approved and approved < requested:
        raise serializers.ValidationError(
            {"approved_date": "Approved date cannot be earlier than the requested date."}
        )


def check_file_size(file):
    if file and file.size > MAX_LETTER_SIZE_MB * 1024 * 1024:
        raise serializers.ValidationError(
            f"File too large. Maximum size is {MAX_LETTER_SIZE_MB} MB."
        )
    return file


class VariationOrderSerializer(serializers.ModelSerializer):

    class Meta:
        model = VariationOrder

        fields = [
            "vo_id",
            "contract",
            "vo_number",
            "value",
            "requested_date",
            "approved_date",
            "description",
            "letter",
        ]

        read_only_fields = [
            "vo_id",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        contract = _value(self, attrs, 'contract')
        value = _value(self, attrs, 'value')
        approved = _value(self, attrs, 'approved_date') is not None

        if value is not None and value == 0:
            raise serializers.ValidationError({'value': 'Variation order value cannot be 0.'})

        if contract and value is not None:
            exclude = self.instance.pk if self.instance else None
            new_value = (
                contract.contract_amount
                + contract.approved_vo_total(exclude_vo=exclude)
                + (value if approved else Decimal('0'))
            )
            if new_value <= 0:
                raise serializers.ValidationError({
                    'value': f'This would make the revised contract amount {_money(new_value)}; it must stay above 0.'
                })
            certified = contract.certified_total()
            if new_value < certified:
                raise serializers.ValidationError({
                    'value': (
                        f'This would reduce the revised contract amount to {_money(new_value)}, '
                        f'below the {_money(certified)} already certified in IPCs.'
                    )
                })
        return attrs

    def validate_letter(self, file):
        return check_file_size(file)

    def validate(self, attrs):
        requested = attrs.get("requested_date", getattr(self.instance, "requested_date", None))
        approved = attrs.get("approved_date", getattr(self.instance, "approved_date", None))
        check_dates(requested, approved)
        return attrs


class ExtensionOfTimeSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExtensionOfTime

        fields = [
            "eot_id",
            "contract",
            "eot_number",
            "approved_days",
            "requested_date",
            "approved_date",
            "reason",
            "letter",
        ]

        read_only_fields = [
            "eot_id",
        ]

    def validate_letter(self, file):
        return check_file_size(file)

    def validate(self, attrs):
        requested = attrs.get("requested_date", getattr(self.instance, "requested_date", None))
        approved = attrs.get("approved_date", getattr(self.instance, "approved_date", None))
        check_dates(requested, approved)
        return attrs

class IPCSerializer(serializers.ModelSerializer):

    class Meta:
        model = IPC

        fields = [
            "ipc_id",
            "contract",
            "ipc_number",
            "ipc_date",
            "certified_amount",
            "paid_amount",
            "retention_amount",
            "advance_deduction",
            "created_at",
        ]

        read_only_fields = [
            "ipc_id",
            "created_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        contract = _value(self, attrs, 'contract')
        certified = _value(self, attrs, 'certified_amount') or Decimal('0')
        paid = _value(self, attrs, 'paid_amount') or Decimal('0')
        retention = _value(self, attrs, 'retention_amount') or Decimal('0')
        deduction = _value(self, attrs, 'advance_deduction') or Decimal('0')

        errors = {}
        for name, amount in (
            ('certified_amount', certified),
            ('paid_amount', paid),
            ('retention_amount', retention),
            ('advance_deduction', deduction),
        ):
            if amount < 0:
                errors[name] = 'Amount cannot be negative.'
        if errors:
            raise serializers.ValidationError(errors)

        if paid + retention > certified:
            raise serializers.ValidationError({
                'paid_amount': (
                    f'Paid ({_money(paid)}) + retention ({_money(retention)}) '
                    f'cannot exceed the certified amount ({_money(certified)}).'
                )
            })

        if contract:
            exclude = self.instance.pk if self.instance else None
            total = contract.certified_total(exclude_ipc=exclude) + certified
            ceiling = contract.current_value()
            if total > ceiling:
                raise serializers.ValidationError({
                    'certified_amount': (
                        f'Total certified would be {_money(total)}, which exceeds the '
                        f'contract amount of {_money(ceiling)} (including approved variation orders).'
                    )
                })

            advance_total = contract.advance_payment_amount or Decimal('0')
            already_recovered = contract.advance_payment_recovered
            if self.instance is not None:
                already_recovered -= (self.instance.advance_deduction or Decimal('0'))
            remaining = advance_total - already_recovered
            if deduction > remaining:
                raise serializers.ValidationError({
                    'advance_deduction': (
                        f'Advance deduction ({_money(deduction)}) exceeds the remaining '
                        f'advance balance ({_money(remaining)}).'
                    )
                })
        return attrs




class ClaimSerializer(serializers.ModelSerializer):

    class Meta:
        model = Claim

        fields = [
            "claim_id",
            "contract",
            "requested_date",
            "approved_date",
            "requested_date",
            "approved_date",
            "claim_amount",
            "description",
            "status",
            "request_letter",
            "approval_letter",
            "request_letter",
            "approval_letter",
        ]

        read_only_fields = [
            "claim_id",
        ]

    def validate_claim_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Claim amount must be greater than 0.')
        return value

    def validate_request_letter(self, file):
        return check_file_size(file)

    def validate_approval_letter(self, file):
        return check_file_size(file)

    def validate(self, attrs):
        requested = attrs.get("requested_date", getattr(self.instance, "requested_date", None))
        approved = attrs.get("approved_date", getattr(self.instance, "approved_date", None))
        check_dates(requested, approved)
        return attrs




class ContractSerializer(serializers.ModelSerializer):

    project_code = serializers.CharField(source="project.project_code", read_only=True)
    contractor_org_name = serializers.CharField(source="contractor_org.name", read_only=True)
    financial_progress_pct = serializers.SerializerMethodField()
    physical_progress_pct = serializers.SerializerMethodField()
    has_boq_items = serializers.SerializerMethodField()

    def get_financial_progress_pct(self, obj):
        denominator = obj.current_value()
        if not denominator:
            return Decimal('0')
        return round(obj.certified_total() / denominator * 100, 2)

    def get_physical_progress_pct(self, obj):
        """Sum of each BOQ item's weighted physical contribution (items' weights total 100%)."""
        return round(sum((i.physical_progress_pct for i in obj.boq_items.all()), Decimal('0')), 2)

    def get_has_boq_items(self, obj):
        return obj.boq_items.exists()

    # Contract lifecycle information
    variation_orders = VariationOrderSerializer(
        many=True,
        read_only=True
    )

    extensions_of_time = ExtensionOfTimeSerializer(
        many=True,
        read_only=True
    )

    ipcs = IPCSerializer(
        many=True,
        read_only=True
    )

    claims = ClaimSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Contract

        fields = [
            # Contract identity
            "contract_id",

            # Relationships
            "project",
            "project_code",
            "contractor_org",
            "contractor_org_name",
            "consultant_org",

            # Contract information
            "contract_number",
            "contract_amount",
            "revised_contract_amount",
            "contract_quantity",
            "quantity_unit",

            # Dates
            "contract_signing_date",
            "commencement_date",
            "original_completion_date",
            "revised_completion_date",
            "contract_duration_months",

            # Security and payment
            "performance_security_amount",
            "performance_security_expiry",
            "retention_rate",
            "advance_payment_amount",
            "advance_payment_recovery_rate",
            "advance_payment_recovered",

            # Status
            "current_status",

            # Computed progress
            "financial_progress_pct",
            "physical_progress_pct",
            "has_boq_items",

            # Audit fields
            "created_at",
            "updated_at",

            # Contract lifecycle
            "variation_orders",
            "extensions_of_time",
            "ipcs",
            "claims",
        ]

        read_only_fields = [
            "contract_id",
            "created_at",
            "updated_at",
            # Computed from approved VariationOrders / ExtensionsOfTime —
            # see contracts/signals.py. Not directly editable.
            "revised_contract_amount",
            "revised_completion_date",
            # Computed from sum of IPC advance_deduction fields — not directly editable.
            "advance_payment_recovered",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        amount = _value(self, attrs, 'contract_amount')
        advance = _value(self, attrs, 'advance_payment_amount')
        security = _value(self, attrs, 'performance_security_amount')
        retention_rate = _value(self, attrs, 'retention_rate')

        errors = {}
        if amount is not None and amount <= 0:
            errors['contract_amount'] = 'Contract amount must be greater than 0.'
        if retention_rate is not None and not (Decimal('0') <= retention_rate <= Decimal('100')):
            errors['retention_rate'] = 'Retention rate must be between 0 and 100.'
        recovery_rate = _value(self, attrs, 'advance_payment_recovery_rate')
        if recovery_rate is not None and not (Decimal('0') <= recovery_rate <= Decimal('100')):
            errors['advance_payment_recovery_rate'] = 'Advance payment recovery rate must be between 0 and 100.'
        for name, value in (
            ('advance_payment_amount', advance),
            ('performance_security_amount', security),
        ):
            if value is not None and value < 0:
                errors[name] = 'Amount cannot be negative.'
        if errors:
            raise serializers.ValidationError(errors)

        advance = advance or Decimal('0')
        if amount:
            if advance > amount:
                errors['advance_payment_amount'] = 'Advance payment cannot exceed the contract amount.'
            if security is not None and security > amount:
                errors['performance_security_amount'] = 'Performance security cannot exceed the contract amount.'
            if self.instance is not None:
                new_value = amount + self.instance.approved_vo_total()
                certified = self.instance.certified_total()
                if new_value < certified:
                    errors['contract_amount'] = (
                        f'The contract value would be {_money(new_value)}, below the '
                        f'{_money(certified)} already certified in IPCs.'
                    )
        commencement = _value(self, attrs, 'commencement_date')
        duration = _value(self, attrs, 'contract_duration_months')
        completion = _value(self, attrs, 'original_completion_date')
        if commencement and duration and completion:
            expected = _add_months(commencement, duration)
            if completion != expected:
                errors['original_completion_date'] = (
                    f'Original Completion Date must equal Commencement Date + Contract Duration '
                    f'({duration} months = {expected.strftime("%Y-%m-%d")}).'
                )
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if 'contract_amount' in validated_data and (
            instance.revised_contract_amount is not None or instance.variation_orders.exists()
        ):
            recalculate_revised_amount(instance)
        return instance


# ============================================================================
# BOQ SERIALIZERS
# ============================================================================

class BOQItemSerializer(serializers.ModelSerializer):
    qty_completion_pct = serializers.ReadOnlyField()
    physical_progress_pct = serializers.ReadOnlyField()
    cumulative_certified_etb = serializers.ReadOnlyField()
    financial_progress_pct = serializers.ReadOnlyField()
    cumulative_qty_completed = serializers.ReadOnlyField()
    section_code = serializers.CharField(source='section.code', read_only=True)
    section_title = serializers.CharField(source='section.title', read_only=True)

    class Meta:
        model = BOQItem
        fields = [
            'item_id', 'section', 'section_code', 'section_title', 'contract',
            'item_no', 'description', 'unit', 'quantity', 'unit_rate_etb',
            'total_price_etb', 'weight_pct',
            'cumulative_qty_completed', 'qty_completion_pct',
            'physical_progress_pct', 'cumulative_certified_etb', 'financial_progress_pct',
        ]
        read_only_fields = ['item_id']

    def validate(self, attrs):
        attrs = super().validate(attrs)

        weight_pct = attrs.get('weight_pct')
        if weight_pct is not None:
            if weight_pct <= Decimal('0'):
                raise serializers.ValidationError(
                    {'weight_pct': 'Weight must be greater than 0.'}
                )
            contract = attrs.get('contract') or (self.instance.contract if self.instance else None)
            if contract:
                existing_total = (
                    BOQItem.objects
                    .filter(contract=contract)
                    .exclude(pk=self.instance.pk if self.instance else None)
                    .aggregate(total=Sum('weight_pct'))['total'] or Decimal('0')
                )
                new_total = existing_total + weight_pct
                if new_total > Decimal('100'):
                    raise serializers.ValidationError({
                        'weight_pct': (
                            f'Total weight would reach {new_total:.4f}%, exceeding 100%. '
                            f'Current allocated weight (excluding this item): {existing_total:.4f}%. '
                            f'Maximum you can assign here: {Decimal("100") - existing_total:.4f}%.'
                        )
                    })

        quantity = attrs.get('quantity')
        if quantity is not None and quantity <= Decimal('0'):
            raise serializers.ValidationError({'quantity': 'Quantity must be greater than 0.'})

        total_price = attrs.get('total_price_etb')
        if total_price is not None and total_price < Decimal('0'):
            raise serializers.ValidationError({'total_price_etb': 'Total price cannot be negative.'})

        unit_rate = attrs.get('unit_rate_etb')
        if unit_rate is not None and unit_rate < Decimal('0'):
            raise serializers.ValidationError({'unit_rate_etb': 'Unit rate cannot be negative.'})

        return attrs


class BOQSectionSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    child_sections = serializers.SerializerMethodField()
    physical_progress_pct = serializers.SerializerMethodField()
    financial_progress_pct = serializers.SerializerMethodField()
    parent_section_code = serializers.CharField(source='parent_section.code', read_only=True)

    class Meta:
        model = BOQSection
        fields = [
            'section_id', 'contract', 'parent_section', 'parent_section_code',
            'code', 'title',
            'items', 'child_sections',
            'physical_progress_pct', 'financial_progress_pct',
        ]
        read_only_fields = ['section_id']

    def get_items(self, obj):
        return BOQItemSerializer(obj.items.all(), many=True, context=self.context).data

    def get_child_sections(self, obj):
        return BOQSectionSerializer(obj.child_sections.all(), many=True, context=self.context).data

    def _collect_all_items(self, section):
        items = list(section.items.all())
        for child in section.child_sections.all():
            items.extend(self._collect_all_items(child))
        return items

    def get_physical_progress_pct(self, obj):
        return round(sum(float(i.physical_progress_pct) for i in self._collect_all_items(obj)), 4)

    def get_financial_progress_pct(self, obj):
        items = self._collect_all_items(obj)
        total_price = sum(float(i.total_price_etb or 0) for i in items)
        total_certified = sum(float(i.cumulative_certified_etb) for i in items)
        if not total_price:
            return 0.0
        return round(total_certified / total_price * 100, 4)


class PhysicalProgressSerializer(serializers.ModelSerializer):
    qty_completion_pct = serializers.ReadOnlyField()
    physical_progress_pct = serializers.ReadOnlyField()
    boq_item_no = serializers.CharField(source='boq_item.item_no', read_only=True)
    boq_item_description = serializers.CharField(source='boq_item.description', read_only=True)
    boq_item_unit = serializers.CharField(source='boq_item.unit', read_only=True)
    boq_item_quantity = serializers.DecimalField(
        source='boq_item.quantity', max_digits=14, decimal_places=4, read_only=True
    )
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)

    class Meta:
        model = PhysicalProgress
        fields = [
            'progress_id', 'boq_item', 'boq_item_no', 'boq_item_description',
            'boq_item_unit', 'boq_item_quantity',
            'record_date', 'actual_qty_completed',
            'recorded_by', 'recorded_by_name',
            'qty_completion_pct', 'physical_progress_pct',
            'created_at',
        ]
        read_only_fields = ['progress_id', 'recorded_by', 'created_at']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        boq_item = attrs.get('boq_item') or (self.instance.boq_item if self.instance else None)
        actual_qty = attrs.get('actual_qty_completed')

        if actual_qty is not None:
            if actual_qty < Decimal('0'):
                raise serializers.ValidationError(
                    {'actual_qty_completed': 'Quantity cannot be negative.'}
                )
            if boq_item and actual_qty > boq_item.quantity:
                raise serializers.ValidationError({
                    'actual_qty_completed': (
                        f'Actual quantity ({actual_qty}) cannot exceed the '
                        f'BOQ item quantity ({boq_item.quantity}).'
                    )
                })
        return attrs


class IPCLineItemSerializer(serializers.ModelSerializer):
    financial_progress_pct = serializers.ReadOnlyField()
    boq_item_no = serializers.CharField(source='boq_item.item_no', read_only=True)
    boq_item_description = serializers.CharField(source='boq_item.description', read_only=True)
    boq_item_total_price = serializers.DecimalField(
        source='boq_item.total_price_etb', max_digits=18, decimal_places=2, read_only=True
    )
    ipc_number = serializers.CharField(source='ipc.ipc_number', read_only=True)
    ipc_date = serializers.DateField(source='ipc.ipc_date', read_only=True)

    class Meta:
        model = IPCLineItem
        fields = [
            'line_item_id',
            'boq_item', 'boq_item_no', 'boq_item_description', 'boq_item_total_price',
            'ipc', 'ipc_number', 'ipc_date',
            'certified_amount_etb', 'remarks',
            'financial_progress_pct',
            'created_at',
        ]
        read_only_fields = ['line_item_id', 'created_at']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        boq_item = attrs.get('boq_item') or (self.instance.boq_item if self.instance else None)
        ipc = attrs.get('ipc') or (self.instance.ipc if self.instance else None)
        certified = attrs.get('certified_amount_etb', Decimal('0')) or Decimal('0')

        if certified < Decimal('0'):
            raise serializers.ValidationError(
                {'certified_amount_etb': 'Certified amount cannot be negative.'}
            )

        if boq_item and ipc:
            if ipc.contract_id != boq_item.contract_id:
                raise serializers.ValidationError({
                    'ipc': 'This IPC does not belong to the same contract as the BOQ item.'
                })

        if boq_item and certified > Decimal('0'):
            existing = (
                boq_item.ipc_line_items
                .exclude(pk=self.instance.pk if self.instance else None)
                .aggregate(total=Sum('certified_amount_etb'))['total'] or Decimal('0')
            )
            total = existing + certified
            if boq_item.total_price_etb and total > boq_item.total_price_etb:
                raise serializers.ValidationError({
                    'certified_amount_etb': (
                        f'Cumulative certified ({total:,.2f} ETB) would exceed '
                        f'the BOQ item total price ({boq_item.total_price_etb:,.2f} ETB).'
                    )
                })
        return attrs