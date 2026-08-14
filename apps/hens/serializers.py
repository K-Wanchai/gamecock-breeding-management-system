from rest_framework import serializers

from apps.hens.models import Hen


class HenSerializer(serializers.ModelSerializer):
    """
    Full CRUD serializer for Hen (STEP4 §PART B). `owner` is always the
    authenticated customer (set in the view/service), never taken from client
    input (Global Rule #11) — it is read-only here.
    """

    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Hen
        fields = (
            'id', 'owner', 'owner_username', 'name', 'breed', 'bloodline', 'age_months',
            'history', 'image', 'status', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'owner', 'created_at', 'updated_at')
