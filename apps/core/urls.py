from django.urls import path

from apps.core.views import FarmSettingView

urlpatterns = [
    path('settings/farm/', FarmSettingView.as_view(), name='farm-setting'),
]
