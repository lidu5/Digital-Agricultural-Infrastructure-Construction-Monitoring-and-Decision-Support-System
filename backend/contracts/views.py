from django.shortcuts import get_object_or_404, render
from rest_framework import viewsets, permissions

from .models import (
    Contract,
    VariationOrder,
    ExtensionOfTime,
    IPC,
    Claim,
)

from .permissions import ContractScopedPermission

from .serializers import (
    ContractSerializer,
    VariationOrderSerializer,
    ExtensionOfTimeSerializer,
    IPCSerializer,
    ClaimSerializer,
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


class ContractViewSet(viewsets.ModelViewSet):
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


class ContractChildViewSet(viewsets.ModelViewSet):
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