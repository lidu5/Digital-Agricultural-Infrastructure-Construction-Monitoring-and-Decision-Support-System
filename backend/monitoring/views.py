import datetime

from django.db.models import Max, Sum
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from geography.models import Region
from projects.models import Project
from .models import (
    ProblemCategory, DocumentType, AlertType,
    ProgressRecord, Issue, Document, Alert, IssueStatus,
)
from .serializers import (
    ProblemCategorySerializer, DocumentTypeSerializer, AlertTypeSerializer,
    ProgressRecordSerializer, IssueSerializer, DocumentSerializer, AlertSerializer,
)
from .permissions import MonitoringScopedPermission, AlertPermission


# Lookup tables — any authenticated user can read/write these for now
class ProblemCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProblemCategory.objects.all()
    serializer_class = ProblemCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class DocumentTypeViewSet(viewsets.ModelViewSet):
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class AlertTypeViewSet(viewsets.ModelViewSet):
    queryset = AlertType.objects.all()
    serializer_class = AlertTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProgressRecordViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressRecordSerializer
    permission_classes = [MonitoringScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = ProgressRecord.objects.all()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class IssueViewSet(viewsets.ModelViewSet):
    serializer_class = IssueSerializer
    permission_classes = [MonitoringScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Issue.objects.all()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs

    def perform_create(self, serializer):
        serializer.save(raised_by=self.request.user)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [MonitoringScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.all()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [AlertPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Alert.objects.all()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if user.role == 'regional_manager':
            return qs.filter(project__region=user.region)
        return qs


class NationalDashboardView(APIView):
    """
    GET /api/monitoring/national-dashboard/

    Single aggregation endpoint powering the National Viewer dashboard:
    region comparison cards, ranked at-risk projects, open technical
    support requests, overdue issues, per-project table rows with
    staleness/risk, and a current-vs-previous-period certified-amount
    comparison for the national card.
    """
    permission_classes = [permissions.IsAuthenticated]

    STALE_DAYS = 30
    TECH_SUPPORT_RISK_WEIGHT = 20
    NEVER_UPDATED_STALENESS = 9999

    def get(self, request):
        today = timezone.now().date()
        user = request.user

        projects = Project.objects.select_related('region').all()
        if user.role == 'regional_manager':
            projects = projects.filter(region=user.region)

        # Latest progress record per project — for staleness and the
        # time-vs-physical gap used by the risk score.
        latest_records = {}
        for pr in (
            ProgressRecord.objects
            .filter(project__in=projects)
            .order_by('project', '-record_date')
        ):
            latest_records.setdefault(pr.project_id, pr)

        project_rows = []
        for p in projects:
            pr = latest_records.get(p.project_id)
            days_stale = (
                (today - pr.record_date).days
                if pr else self.NEVER_UPDATED_STALENESS
            )
            last_update = pr.record_date.isoformat() if pr else None
            gap = 0.0
            time_pct = 0.0
            if pr:
                time_pct = float(pr.time_progress_pct)
                gap = round(max(0.0, time_pct - float(pr.physical_progress_pct)), 2)
            risk = gap + days_stale + (
                self.TECH_SUPPORT_RISK_WEIGHT if p.technical_support_required else 0
            )
            project_rows.append({
                'project_id': str(p.project_id),
                'project_code': p.project_code,
                'project_name': p.project_name,
                'region_id': p.region_id,
                'region_name': p.region.name,
                'status': p.overall_status_flag,
                'physical_pct': float(p.physical_status_pct),
                'financial_pct': float(p.financial_status_pct),
                'time_pct': time_pct,
                'gap_pct': gap,
                'days_stale': days_stale if pr else None,
                'last_update': last_update,
                'technical_support_required': p.technical_support_required,
                'priority_level': p.priority_level,
                'irrigable_area_ha': float(p.designed_irrigable_area_ha or 0),
                'beneficiaries_thh': p.target_beneficiaries_thh or 0,
                'risk_score': round(risk, 2),
            })

        # ---- Region comparison cards -------------------------------------
        regions = Region.objects.all().order_by('name')
        if user.role == 'regional_manager':
            regions = regions.filter(pk=user.region_id)

        region_cards = [
            self._aggregate_card(region.name, [r for r in project_rows if r['region_id'] == region.id],
                                 region_id=region.id)
            for region in regions
        ]
        national_card = self._aggregate_card('National', project_rows)

        # ---- Financial burn: certified this period vs previous period ----
        month_start = today.replace(day=1)
        prev_month_end = month_start - datetime.timedelta(days=1)
        prev_month_start = prev_month_end.replace(day=1)
        cert_qs = ProgressRecord.objects.filter(project__in=projects)
        if user.role == 'regional_manager':
            cert_qs = cert_qs.filter(project__region=user.region)
        certified_current = cert_qs.filter(
            record_date__gte=month_start
        ).aggregate(total=Sum('certified_amount'))['total'] or 0
        certified_previous = cert_qs.filter(
            record_date__gte=prev_month_start,
            record_date__lte=prev_month_end,
        ).aggregate(total=Sum('certified_amount'))['total'] or 0
        national_card['financial_burn'] = {
            'current_period_certified': float(certified_current),
            'previous_period_certified': float(certified_previous),
        }

        # ---- Top 5 at-risk projects --------------------------------------
        at_risk = sorted(project_rows, key=lambda r: r['risk_score'], reverse=True)[:5]

        # ---- Open technical support requests ------------------------------
        tech_issues = (
            Issue.objects
            .filter(
                is_technical_support_request=True,
                status__in=(IssueStatus.OPEN, IssueStatus.IN_PROGRESS, IssueStatus.ESCALATED),
                project__in=projects,
            )
            .select_related('project__region', 'responsible_org')
        )
        tech_support = sorted(
            ({
                'issue_id': str(i.issue_id),
                'project_id': str(i.project_id),
                'project_code': i.project.project_code,
                'project_name': i.project.project_name,
                'region_name': i.project.region.name,
                'days_open': (today - i.raised_date).days if i.raised_date else None,
                'responsible_org': i.responsible_org.name if i.responsible_org else None,
                'status': i.status,
            } for i in tech_issues),
            key=lambda r: (r['days_open'] or 0),
            reverse=True,
        )

        # ---- Overdue issues ------------------------------------------------
        overdue_qs = (
            Issue.objects
            .filter(
                deadline__lt=today,
                project__in=projects,
            )
            .exclude(status=IssueStatus.RESOLVED)
            .select_related('project', 'problem_category', 'responsible_org')
        )
        overdue_issues = sorted(
            ({
                'issue_id': str(i.issue_id),
                'project_id': str(i.project_id),
                'project_code': i.project.project_code,
                'project_name': i.project.project_name,
                'problem_category': i.problem_category.name,
                'days_overdue': (today - i.deadline).days,
                'responsible_org': i.responsible_org.name if i.responsible_org else None,
                'status': i.status,
            } for i in overdue_qs),
            key=lambda r: r['days_overdue'],
            reverse=True,
        )

        return Response({
            'region_cards': region_cards,
            'national_card': national_card,
            'at_risk_projects': at_risk,
            'open_tech_support': tech_support,
            'overdue_issues': overdue_issues,
            'projects': project_rows,
        })

    def _aggregate_card(self, name, rows, region_id=None):
        """Roll up a list of project rows into a region/national card."""
        count = len(rows)
        status_breakdown = {'on_track': 0, 'delayed': 0, 'critical': 0, 'completed': 0}
        stale_days = []
        for r in rows:
            if r['status'] in status_breakdown:
                status_breakdown[r['status']] += 1
            if r['days_stale'] is not None:
                stale_days.append(r['days_stale'])

        avg_stale = round(sum(stale_days) / len(stale_days), 1) if stale_days else None
        card = {
            'region_id': region_id,
            'name': name,
            'total_projects': count,
            'status_breakdown': status_breakdown,
            'avg_physical_pct': round(sum(r['physical_pct'] for r in rows) / count, 2) if count else 0,
            'avg_financial_pct': round(sum(r['financial_pct'] for r in rows) / count, 2) if count else 0,
            'avg_days_since_update': avg_stale,
            'stale': (avg_stale is not None and avg_stale > self.STALE_DAYS),
            'total_irrigable_area_ha': round(sum(r['irrigable_area_ha'] for r in rows), 2),
            'total_beneficiaries_thh': sum(r['beneficiaries_thh'] for r in rows),
        }
        return card