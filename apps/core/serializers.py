from rest_framework import serializers

from apps.core.models import FarmSetting


class FarmSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmSetting
        fields = ('farm_name', 'farm_address', 'bank_name', 'account_number', 'account_holder', 'promptpay')
