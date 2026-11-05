from rest_framework.routers import DefaultRouter

from .views import (
    ContractViewSet,
    VariationOrderViewSet,
    ExtensionOfTimeViewSet,
    IPCViewSet,
    ClaimViewSet,
    BOQSectionViewSet,
    BOQItemViewSet,
    PhysicalProgressViewSet,
    IPCLineItemViewSet,
)

router = DefaultRouter()

router.register(r"contracts",ContractViewSet,basename="contract")

router.register(r"variation-orders",VariationOrderViewSet,basename="variation-order")

router.register(r"extensions-of-time", ExtensionOfTimeViewSet,basename="extension-of-time")

router.register(r"ipcs",IPCViewSet, basename="ipc")

router.register( r"claims",ClaimViewSet, basename="claim")

router.register(r"boq-sections", BOQSectionViewSet, basename="boq-section")
router.register(r"boq-items", BOQItemViewSet, basename="boq-item")
router.register(r"physical-progress", PhysicalProgressViewSet, basename="physical-progress")
router.register(r"ipc-line-items", IPCLineItemViewSet, basename="ipc-line-item")


urlpatterns = router.urls