from rest_framework.routers import DefaultRouter
from .views import UserViewSet, OrganizationViewSet

router = DefaultRouter()
router.register('users', UserViewSet)
router.register('organizations', OrganizationViewSet)

urlpatterns = router.urls