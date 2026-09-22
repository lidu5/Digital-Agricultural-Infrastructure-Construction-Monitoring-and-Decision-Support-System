# pyright: reportMissingModuleSource=false
from django.shortcuts import get_object_or_404, render
from rest_framework import viewsets

from .models import Contract
from .serializers import ContractSerializer

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
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
