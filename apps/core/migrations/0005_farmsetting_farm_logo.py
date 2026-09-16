from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_farm_setting'),
    ]

    operations = [
        migrations.AddField(
            model_name='farmsetting',
            name='farm_logo',
            field=models.ImageField(blank=True, null=True, upload_to='farm/'),
        ),
    ]
