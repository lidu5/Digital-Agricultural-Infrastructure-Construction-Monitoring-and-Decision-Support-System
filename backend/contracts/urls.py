from rest_framework.routers import DefaultRouter

from .views import (
    ContractViewSet,
    VariationOrderViewSet,
    ExtensionOfTimeViewSet,
    IPCViewSet,
    ClaimViewSet,
)

router = DefaultRouter()

router.register(r"",ContractViewSet,basename="contract")

router.register(r"variation-orders",VariationOrderViewSet,basename="variation-order")

router.register(r"extensions-of-time", ExtensionOfTimeViewSet,basename="extension-of-time")

router.register(r"ipcs",IPCViewSet, basename="ipc")

router.register( r"claims",ClaimViewSet, basename="claim")


urlpatterns = router.urls