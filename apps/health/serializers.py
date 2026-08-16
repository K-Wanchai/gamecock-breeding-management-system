from rest_framework import serializers

from apps.chicks.models import Chick

from apps.health.models import HealthRecord


class _RecordedBySummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class _ChickSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Chick
        fields = ('id', 'wing_clip_number', 'name')


class HealthRecordSerializer(serializers.ModelSerializer):
    """Read representation for list/retrieve/create responses."""

    chick = _ChickSummarySerializer(read_only=True)
    recorded_by = _RecordedBySummarySerializer(read_only=True)

    class Meta:
        model = HealthRecord
        fields = (
            'id', 'chick', 'record_date', 'weight', 'symptom', 'observation', 'medicine', 'remark',
            'recorded_by', 'created_at', 'updated_at',
        )
        read_only_fields = fields


class HealthRecordCreateSerializer(serializers.ModelSerializer):
    """POST /api/v1/health-records — ADMIN only."""

    chick = serializers.PrimaryKeyRelatedField(queryset=Chick.objects.all())

    class Meta:
        model = HealthRecord
        fields = ('chick', 'record_date', 'weight', 'symptom', 'observation', 'medicine', 'remark')

    def validate_weight(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('weight must not be negative.')
        return value
