from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_farmsetting_farm_logo'),
    ]

    operations = [
        migrations.AddField(
            model_name='farmsetting',
            name='owner_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
    ]
