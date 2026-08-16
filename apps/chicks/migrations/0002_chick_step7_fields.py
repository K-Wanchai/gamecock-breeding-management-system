import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_booking_step5_fields'),
        ('chicks', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(model_name='chick', old_name='hatch_date', new_name='birth_date'),
        migrations.AddField(
            model_name='chick', name='name', field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='chick',
            name='booking',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='chicks',
                to='bookings.booking',
            ),
        ),
    ]
