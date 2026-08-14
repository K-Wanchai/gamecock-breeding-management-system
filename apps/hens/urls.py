from rest_framework.routers import DefaultRouter

from apps.hens.views import HenViewSet

app_name = 'hens'

router = DefaultRouter()
router.register('', HenViewSet, basename='hen')

urlpatterns = router.urls
