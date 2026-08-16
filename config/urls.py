"""
URL configuration for config project.

API versioning: everything the frontend talks to lives under /api/v1/ (Global Rule #38).
Domain-app routers are included here as they gain endpoints in later steps.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

api_v1_patterns = [
    path('auth/', include('apps.accounts.urls')),
    path('breeders/', include('apps.breeders.urls')),
    path('hens/', include('apps.hens.urls')),
    path('bookings/', include('apps.bookings.urls')),
    path('payments/', include('apps.payments.urls')),
    path('', include('apps.breeding.urls')),
    path('hatchings/', include('apps.hatching.urls')),
    path('chicks/', include('apps.chicks.urls')),
    path('health-records/', include('apps.health.urls')),
    path('vaccinations/', include('apps.vaccinations.urls')),
    path('documents/', include('apps.documents.urls')),

    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Domain routers are added here as each app grows serializers/views/urls.py
    # (see docs/design/step1-system-analysis-database-design.md §13 API Dependency Plan)
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(api_v1_patterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
