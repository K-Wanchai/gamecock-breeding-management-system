from django.db import migrations, models

import apps.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('hens', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='hen',
            name='bloodline',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='hen',
            name='age_months',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.RenameField(
            model_name='hen',
            old_name='image_path',
            new_name='image',
        ),
        migrations.AlterField(
            model_name='hen',
            name='image',
            field=models.ImageField(
                blank=True, max_length=255, null=True, upload_to='hens/%Y/%m/',
                validators=[apps.core.validators.validate_image_file],
            ),
        ),
        migrations.AddConstraint(
            model_name='hen',
            constraint=models.CheckConstraint(
                condition=models.Q(('age_months__gte', 0)), name='ck_hen_age_months_gte_0'
            ),
        ),
    ]
