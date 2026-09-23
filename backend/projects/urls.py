from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, MilestoneTypeViewSet, ProjectMilestoneViewSet

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('milestone-types', MilestoneTypeViewSet)
router.register('project-milestones', ProjectMilestoneViewSet, basename='projectmilestone')

urlpatterns = router.urls