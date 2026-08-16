from django.db.models import Q
from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.documents import services
from apps.documents.models import Document
from apps.documents.permissions import DocumentWritePermission
from apps.documents.serializers import DocumentGenerateSerializer, DocumentSerializer


class DocumentViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    /api/v1/documents/ (STEP8). ADMIN generates (create = generate a PEDIGREE_CERTIFICATE
    or DELIVERY_DOCUMENT for a Chick), CUSTOMER reads/downloads only their own documents.
    No update/delete — a generated document is immutable; corrections mean generating
    a new document, not editing an old one.
    """

    permission_classes = (DocumentWritePermission,)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('document_type', 'chick', 'booking')
    search_fields = ('document_number',)
    ordering_fields = ('generated_at', 'created_at')
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = Document.objects.select_related(
            'booking__customer', 'chick__hatching__egg__booking__customer', 'generated_by',
        ).all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(Q(booking__customer=user) | Q(chick__hatching__egg__booking__customer=user))

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentGenerateSerializer
        return DocumentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = services.generate_document(
            document_type=serializer.validated_data['document_type'],
            chick_id=serializer.validated_data['chick'].id,
            actor=request.user,
        )
        return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        document = self.get_object()
        file_field = services.get_document_file(document)
        return FileResponse(
            file_field.open('rb'), as_attachment=True, filename=f'{document.document_number}.pdf',
            content_type='application/pdf',
        )
