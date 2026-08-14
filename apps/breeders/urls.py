from rest_framework.routers import DefaultRouter

from apps.breeders.views import BreederViewSet

app_name = 'breeders'

router = DefaultRouter()
router.register('', BreederViewSet, basename='breeder')

urlpatterns = router.urls
