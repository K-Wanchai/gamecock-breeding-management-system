from rest_framework.routers import DefaultRouter

from apps.breeding.views import BreedingEventViewSet, EggViewSet

app_name = 'breeding'

router = DefaultRouter()
router.register('breeding-events', BreedingEventViewSet, basename='breeding-event')
router.register('eggs', EggViewSet, basename='egg')

urlpatterns = router.urls
