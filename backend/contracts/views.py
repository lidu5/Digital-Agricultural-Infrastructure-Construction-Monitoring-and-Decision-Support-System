from django.shortcuts import get_object_or_404, render
from rest_framework import viewsets, permissions

from audit.mixins import AuditLogMixin
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

from .permissions import ContractScopedPermission

from .serializers import (
    ContractSerializer,
    VariationOrderSerializer,
    ExtensionOfTimeSerializer,
    IPCSerializer,
    ClaimSerializer,
    BOQSectionSerializer,
    BOQItemSerializer,
    PhysicalProgressSerializer,
    IPCLineItemSerializer,
)


def contract_detail(request, contract_id):

    contract = get_object_or_404(
        Contract,
        contract_id=contract_id
    )

    claims = contract.claims.all()
    ipcs = contract.ipcs.all()
    variation_orders = contract.variation_orders.all()
    extensions_of_time = contract.extensions_of_time.all()

    context = {
        "contract": contract,
        "claims": claims,
        "ipcs": ipcs,
        "variation_orders": variation_orders,
        "extensions_of_time": extensions_of_time,
    }

    return render(
        request,
        "contracts/contract_detail.html",
        context
    )


class ContractViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Contract.objects.select_related('project', 'contractor_org').all()

        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)

        if user.role == 'regional_manager':
            # Regional managers can only see contracts for projects in their region
            return qs.filter(project__region=user.region)
        
        # Admins and national viewers see all contracts
        return qs


class ContractChildViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    Base for the lifecycle viewsets (VO / EoT / IPC / Claim).
    Honors ?contract=<id> and keeps regional managers inside their region,
    mirroring ContractViewSet.get_queryset.
    """
    permission_classes = [ContractScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.select_related('contract', 'contract__project').all()

        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)

        if user.role == 'regional_manager':
            qs = qs.filter(contract__project__region=user.region)

        return qs


class VariationOrderViewSet(ContractChildViewSet):
    queryset = VariationOrder.objects.all()
    serializer_class = VariationOrderSerializer


class ExtensionOfTimeViewSet(ContractChildViewSet):
    queryset = ExtensionOfTime.objects.all()
    serializer_class = ExtensionOfTimeSerializer


class IPCViewSet(ContractChildViewSet):
    queryset = IPC.objects.all()
    serializer_class = IPCSerializer


class ClaimViewSet(ContractChildViewSet):
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer


# ============================================================================
# BOQ ViewSets
# ============================================================================

class BOQSectionViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = BOQSectionSerializer
    permission_classes = [ContractScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = (
            BOQSection.objects
            .select_related('contract', 'contract__project', 'parent_section')
            .prefetch_related('items', 'child_sections', 'child_sections__items')
        )
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        if user.role == 'regional_manager':
            qs = qs.filter(contract__project__region=user.region)
        return qs


class BOQItemViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = BOQItemSerializer
    permission_classes = [ContractScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = BOQItem.objects.select_related('section', 'contract', 'contract__project')
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        section_id = self.request.query_params.get('section')
        if section_id:
            qs = qs.filter(section_id=section_id)
        if user.role == 'regional_manager':
            qs = qs.filter(contract__project__region=user.region)
        return qs


class PhysicalProgressViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = PhysicalProgressSerializer
    permission_classes = [ContractScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = PhysicalProgress.objects.select_related(
            'boq_item', 'boq_item__contract', 'boq_item__contract__project', 'recorded_by'
        )
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(boq_item__contract_id=contract_id)
        boq_item_id = self.request.query_params.get('boq_item')
        if boq_item_id:
            qs = qs.filter(boq_item_id=boq_item_id)
        if user.role == 'regional_manager':
            qs = qs.filter(boq_item__contract__project__region=user.region)
        return qs

    def perform_create(self, serializer):
        from audit.mixins import AuditAction, _snapshot, _write_log
        instance = serializer.save(recorded_by=self.request.user)
        _write_log(self.request, AuditAction.CREATE, instance, _snapshot(instance))


class IPCLineItemViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = IPCLineItemSerializer
    permission_classes = [ContractScopedPermission]

    def get_queryset(self):
        user = self.request.user
        qs = IPCLineItem.objects.select_related(
            'boq_item', 'boq_item__contract', 'boq_item__contract__project', 'ipc'
        )
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(boq_item__contract_id=contract_id)
        ipc_id = self.request.query_params.get('ipc')
        if ipc_id:
            qs = qs.filter(ipc_id=ipc_id)
        boq_item_id = self.request.query_params.get('boq_item')
        if boq_item_id:
            qs = qs.filter(boq_item_id=boq_item_id)
        if user.role == 'regional_manager':
            qs = qs.filter(boq_item__contract__project__region=user.region)
        return qs