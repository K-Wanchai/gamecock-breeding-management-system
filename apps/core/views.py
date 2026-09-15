from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import FarmSetting
from apps.core.permissions import IsAdminRole
from apps.core.serializers import FarmSettingSerializer


class FarmSettingView(APIView):
    """
    GET  — any authenticated user (customers need bank info for the payment screen)
    PATCH — admin only
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def get(self, request):
        return Response(FarmSettingSerializer(FarmSetting.load()).data)

    def patch(self, request):
        setting = FarmSetting.load()
        serializer = FarmSettingSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
