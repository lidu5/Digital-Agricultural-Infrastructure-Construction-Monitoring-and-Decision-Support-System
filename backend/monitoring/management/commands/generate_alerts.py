"""
Checks contracts and progress records against fixed thresholds and
writes Alert rows. Meant to run on a schedule (see the bottom of this
guide for Windows Task Scheduler setup) — not something a user triggers
by hand in normal operation.

Idempotent: won't create a duplicate alert if an open one of the same
type already exists for the same project/contract, and will auto-close
an alert if the underlying condition is no longer true.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Sum

from contracts.models import Contract, VariationOrder, ExtensionOfTime
from monitoring.models import Alert, AlertType, ProgressRecord, AlertSeverity, AlertStatus


# --- Thresholds, adjust here as your organization defines them precisely ---
CONTRACT_NEARING_DAYS = 30      # flag if completion date is within this many days
SECURITY_EXPIRY_DAYS = 30       # flag if performance security expires within this many days
VARIATION_THRESHOLD_PCT = 10    # flag if cumulative VOs exceed this % of contract amount
UNDERPERFORMANCE_GAP_PCT = 15   # flag if time progress leads physical progress by this many points

ALERT_TYPES = [
    'Contract nearing completion',
    'Contract expired',
    'Performance security expiring',
    'Advance payment not recovered',
    'Excessive variation',
    'Extension of time',
    'Contractor underperformance',
]


class Command(BaseCommand):
    help = 'Evaluates contracts and progress records, creating/resolving Alert rows.'

    def handle(self, *args, **options):
        self.alert_types = {}
        for name in ALERT_TYPES:
            obj, _ = AlertType.objects.get_or_create(name=name)
            self.alert_types[name] = obj

        today = date.today()
        created_count = 0
        resolved_count = 0

        for contract in Contract.objects.select_related('project').filter(current_status='active'):
            created_count += self._check_nearing_and_expired(contract, today)
            created_count += self._check_security_expiring(contract, today)
            created_count += self._check_advance_payment(contract)
            created_count += self._check_excessive_variation(contract)
            created_count += self._check_extension_of_time(contract)
            created_count += self._check_underperformance(contract)

        resolved_count = self._auto_resolve_stale_alerts()

        self.stdout.write(self.style.SUCCESS(
            f"Done. {created_count} alert(s) created/kept open, {resolved_count} auto-resolved."
        ))

    # ------------------------------------------------------------------
    def _get_or_open_alert(self, project, contract, alert_type_name, severity, details):
        """Create the alert only if an open one of this type doesn't already exist."""
        existing = Alert.objects.filter(
            project=project, contract=contract,
            alert_type=self.alert_types[alert_type_name],
            status__in=[AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
        ).first()
        if existing:
            return 0  # already open, nothing to do
        Alert.objects.create(
            project=project, contract=contract,
            alert_type=self.alert_types[alert_type_name],
            severity=severity, details=details,
        )
        return 1

    def _auto_resolve(self, project, contract, alert_type_name):
        """Close an open alert of this type if the condition no longer applies."""
        updated = Alert.objects.filter(
            project=project, contract=contract,
            alert_type=self.alert_types[alert_type_name],
            status__in=[AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
        ).update(status=AlertStatus.RESOLVED, resolved_date=date.today())
        return updated

    # ------------------------------------------------------------------
    def _check_nearing_and_expired(self, contract, today):
        deadline = contract.revised_completion_date or contract.original_completion_date
        if not deadline:
            return 0
        created = 0
        if deadline < today:
            created += self._get_or_open_alert(
                contract.project, contract, 'Contract expired', AlertSeverity.CRITICAL,
                f"Completion date {deadline} has passed; contract still marked active."
            )
        elif deadline <= today + timedelta(days=CONTRACT_NEARING_DAYS):
            created += self._get_or_open_alert(
                contract.project, contract, 'Contract nearing completion', AlertSeverity.MEDIUM,
                f"Completion date {deadline} is within {CONTRACT_NEARING_DAYS} days."
            )
        else:
            self._auto_resolve(contract.project, contract, 'Contract expired')
            self._auto_resolve(contract.project, contract, 'Contract nearing completion')
        return created

    def _check_security_expiring(self, contract, today):
        expiry = contract.performance_security_expiry
        if not expiry:
            return 0
        if expiry <= today + timedelta(days=SECURITY_EXPIRY_DAYS):
            return self._get_or_open_alert(
                contract.project, contract, 'Performance security expiring', AlertSeverity.MEDIUM,
                f"Performance security expires {expiry}."
            )
        self._auto_resolve(contract.project, contract, 'Performance security expiring')
        return 0

    def _check_advance_payment(self, contract):
        outstanding = contract.advance_payment_amount - contract.advance_payment_recovered
        deadline = contract.revised_completion_date or contract.original_completion_date
        if outstanding > 0 and deadline and deadline <= date.today() + timedelta(days=CONTRACT_NEARING_DAYS):
            return self._get_or_open_alert(
                contract.project, contract, 'Advance payment not recovered', AlertSeverity.HIGH,
                f"{outstanding} of advance payment still unrecovered as completion approaches."
            )
        self._auto_resolve(contract.project, contract, 'Advance payment not recovered')
        return 0

    def _check_excessive_variation(self, contract):
        total_variation = VariationOrder.objects.filter(contract=contract).aggregate(
            total=Sum('value'))['total'] or Decimal('0')
        if contract.contract_amount and total_variation:
            pct = (total_variation / contract.contract_amount) * 100
            if pct > VARIATION_THRESHOLD_PCT:
                return self._get_or_open_alert(
                    contract.project, contract, 'Excessive variation', AlertSeverity.HIGH,
                    f"Cumulative variations are {pct:.1f}% of contract value (threshold {VARIATION_THRESHOLD_PCT}%)."
                )
        self._auto_resolve(contract.project, contract, 'Excessive variation')
        return 0

    def _check_extension_of_time(self, contract):
        has_eot = ExtensionOfTime.objects.filter(contract=contract).exists()
        if has_eot:
            return self._get_or_open_alert(
                contract.project, contract, 'Extension of time', AlertSeverity.LOW,
                "At least one extension of time has been granted on this contract."
            )
        self._auto_resolve(contract.project, contract, 'Extension of time')
        return 0

    def _check_underperformance(self, contract):
        latest = ProgressRecord.objects.filter(contract=contract).order_by('-record_date').first()
        if not latest:
            return 0
        gap = latest.time_progress_pct - latest.physical_progress_pct
        if gap > UNDERPERFORMANCE_GAP_PCT:
            return self._get_or_open_alert(
                contract.project, contract, 'Contractor underperformance', AlertSeverity.HIGH,
                f"Time progress leads physical progress by {gap:.1f} points as of {latest.record_date}."
            )
        self._auto_resolve(contract.project, contract, 'Contractor underperformance')
        return 0

    def _auto_resolve_stale_alerts(self):
        # Placeholder for symmetry / future use — each _check_* method already
        # auto-resolves its own alert type inline above when conditions clear.
        return 0