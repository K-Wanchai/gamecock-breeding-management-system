import datetime

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(model_name='booking', old_name='agreed_price', new_name='price'),
        migrations.RenameField(model_name='booking', old_name='amount_paid', new_name='paid_amount'),
        migrations.RenameField(model_name='booking', old_name='balance_due', new_name='remaining_amount'),
        migrations.AddField(
            model_name='booking',
            name='booking_date',
            field=models.DateField(default=datetime.date(2026, 1, 1)),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='booking_number',
            field=models.CharField(default='', editable=False, max_length=20, unique=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='note',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'รอดำเนินการ'), ('WAITING_PAYMENT', 'รอชำระเงิน'), ('PAID', 'ชำระมัดจำแล้ว'),
                    ('APPROVED', 'อนุมัติแล้ว/ล็อกคิว'), ('IN_PROGRESS', 'กำลังดำเนินการผสม'),
                    ('COMPLETED', 'เสร็จสิ้น'), ('CANCELLED', 'ยกเลิก'), ('REJECTED', 'ปฏิเสธ'),
                ],
                db_index=True, default='PENDING', max_length=20,
            ),
        ),
        migrations.RemoveConstraint(model_name='booking', name='uq_booking_hen_active'),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ('status__in', ['PENDING', 'WAITING_PAYMENT', 'PAID', 'APPROVED', 'IN_PROGRESS'])
                ),
                fields=('hen',), name='uq_booking_hen_active',
            ),
        ),
        migrations.RemoveConstraint(model_name='booking', name='ck_booking_deposit_between_0_and_price'),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(
                condition=models.Q(('deposit_amount__gte', 0)) & models.Q(('deposit_amount__lte', models.F('price'))),
                name='ck_booking_deposit_between_0_and_price',
            ),
        ),
        migrations.RemoveConstraint(model_name='booking', name='ck_booking_amount_paid_gte_0'),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(
                condition=models.Q(('paid_amount__gte', 0)), name='ck_booking_paid_amount_gte_0'
            ),
        ),
        migrations.RemoveConstraint(model_name='booking', name='ck_booking_balance_due_gte_0'),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(
                condition=models.Q(('remaining_amount__gte', 0)), name='ck_booking_remaining_amount_gte_0'
            ),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(
                condition=models.Q(('status__in', [
                    'PENDING', 'WAITING_PAYMENT', 'PAID', 'APPROVED', 'IN_PROGRESS',
                    'COMPLETED', 'CANCELLED', 'REJECTED',
                ])),
                name='ck_booking_status_valid',
            ),
        ),
    ]
