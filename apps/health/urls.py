from rest_framework.routers import DefaultRouter

from apps.health.views import HealthRecordViewSet

app_name = 'health'

router = DefaultRouter()
router.register('', HealthRecordViewSet, basename='health-record')

urlpatterns = router.urls
