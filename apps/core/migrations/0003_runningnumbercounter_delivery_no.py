from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_alter_runningnumbercounter_counter_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='runningnumbercounter',
            name='counter_type',
            field=models.CharField(choices=[
                ('WING_CLIP', 'Wing Clip Number'), ('BOOKING_QUEUE', 'Booking Number'),
                ('CONTRACT_NO', 'Contract Document Number'), ('PEDIGREE_NO', 'Pedigree Document Number'),
                ('DELIVERY_NO', 'Delivery Document Number'), ('PAYMENT_NO', 'Payment Number'),
            ], max_length=20),
        ),
    ]
