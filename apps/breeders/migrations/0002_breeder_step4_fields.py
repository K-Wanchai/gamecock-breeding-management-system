from django.db import migrations, models

import apps.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('breeders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='breeder',
            name='breed',
            field=models.CharField(blank=True, db_index=True, max_length=150, null=True),
        ),
        migrations.RenameField(
            model_name='breeder',
            old_name='history',
            new_name='description',
        ),
        migrations.RenameField(
            model_name='breeder',
            old_name='image_path',
            new_name='image',
        ),
        migrations.AlterField(
            model_name='breeder',
            name='image',
            field=models.ImageField(
                blank=True, max_length=255, null=True, upload_to='breeders/%Y/%m/',
                validators=[apps.core.validators.validate_image_file],
            ),
        ),
        migrations.AddField(
            model_name='breeder',
            name='service_start_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
