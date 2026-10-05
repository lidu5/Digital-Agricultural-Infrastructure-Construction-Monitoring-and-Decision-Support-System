from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, OrganizationViewSet, current_user

router = DefaultRouter()
router.register('users', UserViewSet)
router.register('organizations', OrganizationViewSet)

urlpatterns = [
    path('me/', current_user, name='current-user'),
] + router.urls