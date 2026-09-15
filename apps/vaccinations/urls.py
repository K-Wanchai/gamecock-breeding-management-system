from rest_framework.routers import DefaultRouter

from apps.vaccinations.views import VaccinationViewSet, VaccinePresetViewSet

app_name = 'vaccinations'

router = DefaultRouter()
router.register('presets', VaccinePresetViewSet, basename='vaccine-preset')
router.register('', VaccinationViewSet, basename='vaccination')

urlpatterns = router.urls
