from rest_framework.routers import DefaultRouter
from .views import (
    ProblemCategoryViewSet, DocumentTypeViewSet, AlertTypeViewSet,
    ProgressRecordViewSet, IssueViewSet, DocumentViewSet, AlertViewSet,
)

router = DefaultRouter()
router.register('problem-categories', ProblemCategoryViewSet)
router.register('document-types', DocumentTypeViewSet)
router.register('alert-types', AlertTypeViewSet)
router.register('progress-records', ProgressRecordViewSet, basename='progressrecord')
router.register('issues', IssueViewSet, basename='issue')
router.register('documents', DocumentViewSet, basename='document')
router.register('alerts', AlertViewSet, basename='alert')

urlpatterns = router.urls