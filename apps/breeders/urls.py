from rest_framework.routers import DefaultRouter

from apps.breeders.views import BreederMonthlyQuotaViewSet, BreederViewSet

app_name = 'breeders'

router = DefaultRouter()
router.register('breeders', BreederViewSet, basename='breeder')
router.register('breeder-quotas', BreederMonthlyQuotaViewSet, basename='breeder-quota')

urlpatterns = router.urls
