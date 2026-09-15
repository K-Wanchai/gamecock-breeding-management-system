from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0003_runningnumbercounter_delivery_no'),
    ]

    operations = [
        migrations.CreateModel(
            name='FarmSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('farm_name', models.CharField(default='ฟาร์มไก่ชน', max_length=200)),
                ('farm_address', models.TextField(blank=True, default='')),
                ('bank_name', models.CharField(blank=True, default='', max_length=100)),
                ('account_number', models.CharField(blank=True, default='', max_length=50)),
                ('account_holder', models.CharField(blank=True, default='', max_length=200)),
                ('promptpay', models.CharField(blank=True, default='', max_length=20)),
            ],
            options={
                'verbose_name': 'Farm Setting',
            },
        ),
    ]
