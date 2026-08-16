from rest_framework.routers import DefaultRouter

from apps.chicks.views import ChickViewSet

app_name = 'chicks'

router = DefaultRouter()
router.register('', ChickViewSet, basename='chick')

urlpatterns = router.urls
