from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0004_insemination_record'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='clip_ready',
            field=models.BooleanField(default=False),
        ),
    ]
