from rest_framework.routers import DefaultRouter

from apps.vaccinations.views import VaccinationViewSet

app_name = 'vaccinations'

router = DefaultRouter()
router.register('', VaccinationViewSet, basename='vaccination')

urlpatterns = router.urls
