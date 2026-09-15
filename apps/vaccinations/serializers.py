from rest_framework import serializers

from apps.chicks.models import Chick

from apps.vaccinations.models import Vaccination, VaccinePreset


class VaccinePresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccinePreset
        fields = ('id', 'name')


class _RecordedBySummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class _ChickSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Chick
        fields = ('id', 'wing_clip_number', 'name')


class VaccinationSerializer(serializers.ModelSerializer):
    """Read representation for list/retrieve/create responses."""

    chick = _ChickSummarySerializer(read_only=True)
    recorded_by = _RecordedBySummarySerializer(read_only=True)

    class Meta:
        model = Vaccination
        fields = (
            'id', 'chick', 'vaccine_name', 'vaccination_date', 'age_days', 'dose_number', 'remark',
            'recorded_by', 'created_at', 'updated_at',
        )
        read_only_fields = fields


class VaccinationCreateSerializer(serializers.ModelSerializer):
    """
    POST /api/v1/vaccinations — ADMIN only. age_days is never accepted from the
    client — it is always computed server-side in
    apps.vaccinations.services.record_vaccination() (Global Rule #11).
    """

    chick = serializers.PrimaryKeyRelatedField(queryset=Chick.objects.all())

    class Meta:
        model = Vaccination
        fields = ('chick', 'vaccine_name', 'vaccination_date', 'dose_number', 'remark')

    def validate_dose_number(self, value):
        if value < 1:
            raise serializers.ValidationError('dose_number must be at least 1.')
        return value
