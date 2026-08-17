from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.notifications.views import LineLinkCodeView, LineWebhookView, NotificationViewSet

app_name = 'notifications'

router = DefaultRouter()
router.register('', NotificationViewSet, basename='notification')

urlpatterns = [
    path('line/link-code/', LineLinkCodeView.as_view(), name='line-link-code'),
    path('line/webhook/', LineWebhookView.as_view(), name='line-webhook'),
] + router.urls
