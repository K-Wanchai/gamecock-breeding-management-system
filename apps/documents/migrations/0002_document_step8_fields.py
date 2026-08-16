import apps.documents.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0001_initial'),
    ]

    operations = [
        migrations.RemoveConstraint(model_name='document', name='ck_document_ownership_by_type'),
        migrations.RenameField(model_name='document', old_name='document_no', new_name='document_number'),
        migrations.AlterField(
            model_name='document', name='document_number',
            field=models.CharField(editable=False, max_length=30, unique=True),
        ),
        migrations.AlterField(
            model_name='document',
            name='document_type',
            field=models.CharField(choices=[
                ('CONTRACT', 'ใบรับฝากผสม/สัญญา'), ('PEDIGREE_CERTIFICATE', 'ใบรับรองสายพันธุ์'),
                ('DELIVERY_DOCUMENT', 'เอกสารส่งมอบ'),
            ], db_index=True, max_length=25),
        ),
        migrations.AlterField(
            model_name='document',
            name='file_path',
            field=models.FileField(
                blank=True, max_length=255, null=True, upload_to=apps.documents.models.document_upload_path,
            ),
        ),
        migrations.AddConstraint(
            model_name='document',
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(('booking__isnull', False), ('chick__isnull', True), ('document_type', 'CONTRACT'))
                    | models.Q(('chick__isnull', False), ('document_type__in', ['PEDIGREE_CERTIFICATE', 'DELIVERY_DOCUMENT']))
                ),
                name='ck_document_ownership_by_type',
            ),
        ),
        migrations.AddConstraint(
            model_name='document',
            constraint=models.UniqueConstraint(
                condition=models.Q(('chick__isnull', False)), fields=('chick', 'document_type'),
                name='uq_document_chick_type',
            ),
        ),
    ]
