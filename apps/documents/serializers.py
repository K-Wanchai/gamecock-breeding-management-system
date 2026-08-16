from rest_framework import serializers

from apps.chicks.models import Chick

from apps.documents.models import Document


class _GeneratedBySummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class _ChickSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Chick
        fields = ('id', 'wing_clip_number', 'name')


class _BookingSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    booking_number = serializers.CharField()


class DocumentSerializer(serializers.ModelSerializer):
    """Read representation for list/retrieve/generate responses."""

    chick = _ChickSummarySerializer(read_only=True)
    booking = _BookingSummarySerializer(read_only=True)
    generated_by = _GeneratedBySummarySerializer(read_only=True)

    class Meta:
        model = Document
        fields = (
            'id', 'public_uuid', 'document_type', 'document_number', 'booking', 'chick',
            'generated_at', 'generated_by', 'created_at', 'updated_at',
        )
        read_only_fields = fields


class DocumentGenerateSerializer(serializers.Serializer):
    """
    POST /api/v1/documents — ADMIN only. Only `chick` and `document_type` are
    accepted; every other value shown on the PDF is read straight from the
    database inside the service/pdf layer — a client can never supply document
    content (Global Rule #11, STEP8 PDF rule).
    """

    chick = serializers.PrimaryKeyRelatedField(queryset=Chick.objects.all())
    document_type = serializers.ChoiceField(choices=(
        (Document.DocumentType.PEDIGREE_CERTIFICATE, Document.DocumentType.PEDIGREE_CERTIFICATE.label),
        (Document.DocumentType.DELIVERY_DOCUMENT, Document.DocumentType.DELIVERY_DOCUMENT.label),
    ))
