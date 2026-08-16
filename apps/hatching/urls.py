from rest_framework.routers import DefaultRouter

from apps.hatching.views import HatchingViewSet

app_name = 'hatching'

router = DefaultRouter()
router.register('', HatchingViewSet, basename='hatching')

urlpatterns = router.urls
