from rest_framework import serializers

from apps.hatching.models import Hatching

from apps.chicks.models import Chick


class _HatchingSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Hatching
        fields = ('id', 'status', 'hatched_count')


class _BookingSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    booking_number = serializers.CharField()


class ChickSerializer(serializers.ModelSerializer):
    """Read representation for list/retrieve/create responses."""

    hatching = _HatchingSummarySerializer(read_only=True)
    booking = _BookingSummarySerializer(read_only=True)

    class Meta:
        model = Chick
        fields = (
            'id', 'hatching', 'booking', 'name', 'wing_clip_number', 'birth_date', 'gender', 'color_note',
            'status', 'created_at', 'updated_at',
        )
        read_only_fields = fields


class ChickCreateSerializer(serializers.ModelSerializer):
    """
    POST /api/v1/chicks — ADMIN only. `booking` is never accepted from the client
    (Global Rule #11) — it is always derived server-side from hatching.egg.booking
    inside apps.chicks.services.create_chick(). wing_clip_number stays server-generated
    (unchanged since STEP1); a formal wing-clip management API is STEP8 scope.
    """

    hatching = serializers.PrimaryKeyRelatedField(queryset=Hatching.objects.all())

    class Meta:
        model = Chick
        fields = ('hatching', 'name', 'birth_date', 'gender', 'color_note')
