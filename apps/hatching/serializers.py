from rest_framework import serializers

from apps.breeding.models import Egg

from apps.hatching.models import Hatching
from apps.hatching.services import calculate_hatching_rate


class _RecordedBySummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class _EggSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Egg
        fields = ('id', 'booking', 'total_eggs', 'egg_date')


class HatchingSerializer(serializers.ModelSerializer):
    """Read representation for list/retrieve/start/complete responses."""

    egg = _EggSummarySerializer(read_only=True)
    recorded_by = _RecordedBySummarySerializer(read_only=True)
    hatching_rate = serializers.SerializerMethodField()

    class Meta:
        model = Hatching
        fields = (
            'id', 'egg', 'status', 'started_at', 'completed_at', 'total_eggs', 'hatched_count', 'failed_count',
            'survival_count', 'hatching_rate', 'remark', 'recorded_by', 'created_at', 'updated_at',
        )
        read_only_fields = fields

    def get_hatching_rate(self, obj):
        return str(calculate_hatching_rate(obj))


class HatchingStartSerializer(serializers.Serializer):
    """POST /api/v1/hatchings — ADMIN only. Opens a new batch against an Egg;
    total_eggs is always snapshotted server-side from the Egg (Global Rule #11)."""

    egg = serializers.PrimaryKeyRelatedField(queryset=Egg.objects.all())
    started_at = serializers.DateField()
    remark = serializers.CharField(required=False, allow_blank=True)


class HatchingCompleteSerializer(serializers.Serializer):
    """PATCH /api/v1/hatchings/{id}/complete/ — ADMIN only."""

    completed_at = serializers.DateField()
    hatched_count = serializers.IntegerField(min_value=0)
    failed_count = serializers.IntegerField(min_value=0, required=False, default=0)
    survival_count = serializers.IntegerField(min_value=0, required=False, default=0)
    remark = serializers.CharField(required=False, allow_blank=True)
