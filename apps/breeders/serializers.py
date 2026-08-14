from rest_framework import serializers

from apps.breeders.models import Breeder


class BreederSerializer(serializers.ModelSerializer):
    """
    Full CRUD serializer for Breeder (STEP4 §PART A). `created_by` is always taken
    from the authenticated admin in the view/service, never from client input
    (Global Rule #11), so it is read-only here.
    """

    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Breeder
        fields = (
            'id', 'name', 'breed', 'bloodline', 'description', 'image',
            'service_rate', 'default_monthly_quota', 'status', 'service_start_date',
            'created_by', 'created_by_username', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def validate_service_rate(self, value):
        # DB also enforces this (ck_breeder_service_rate_gte_0) — checked here too so a
        # bad value gets a clean 400 instead of falling through to a raw IntegrityError
        # (Global Rule #20: app validation must not rely on the DB constraint alone).
        if value < 0:
            raise serializers.ValidationError('service_rate must be greater than or equal to 0.')
        return value

    def validate_default_monthly_quota(self, value):
        if value < 0:
            raise serializers.ValidationError('default_monthly_quota must be greater than or equal to 0.')
        return value
