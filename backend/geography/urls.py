from rest_framework.routers import DefaultRouter
from .views import (
    RegionViewSet, ZoneViewSet, WoredaViewSet, KebeleViewSet,
    ProjectTypeViewSet, WaterSourceViewSet, IrrigationTechnologyViewSet,
    IrrigationSystemViewSet, ProjectCategoryViewSet,
    FinancingSourceViewSet, CropViewSet,
)

router = DefaultRouter()
router.register('regions', RegionViewSet)
router.register('zones', ZoneViewSet)
router.register('woredas', WoredaViewSet)
router.register('kebeles', KebeleViewSet)
router.register('project-types', ProjectTypeViewSet)
router.register('water-sources', WaterSourceViewSet)
router.register('irrigation-technologies', IrrigationTechnologyViewSet)
router.register('irrigation-systems', IrrigationSystemViewSet)
router.register('project-categories', ProjectCategoryViewSet)
router.register('financing-sources', FinancingSourceViewSet)
router.register('crops', CropViewSet)

urlpatterns = router.urls