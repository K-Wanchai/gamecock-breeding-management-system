from django.db import migrations, models

import apps.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(model_name='payment', old_name='reviewed_by', new_name='verified_by'),
        migrations.RenameField(model_name='payment', old_name='reviewed_at', new_name='verified_at'),
        migrations.RenameField(model_name='payment', old_name='reject_reason', new_name='remark'),
        migrations.AddField(
            model_name='payment',
            name='payment_number',
            field=models.CharField(default='', editable=False, max_length=20, unique=True),
            preserve_default=False,
        ),
        migrations.RemoveField(model_name='payment', name='slip_image_path'),
        migrations.AddField(
            model_name='payment',
            name='slip',
            field=models.ImageField(
                default='', max_length=255, upload_to='payment_slips/%Y/%m/',
                validators=[apps.core.validators.validate_image_file],
            ),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='payment',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'รอตรวจสอบ'), ('APPROVED', 'อนุมัติแล้ว'),
                    ('REJECTED', 'ปฏิเสธ'), ('CANCELLED', 'ยกเลิก'),
                ],
                db_index=True, default='PENDING', max_length=15,
            ),
        ),
        migrations.RemoveConstraint(model_name='payment', name='uq_payment_pending_type'),
        migrations.AddConstraint(
            model_name='payment',
            constraint=models.UniqueConstraint(
                condition=models.Q(('status', 'PENDING')), fields=('booking', 'payment_type'),
                name='uq_payment_pending_type',
            ),
        ),
        migrations.AddConstraint(
            model_name='payment',
            constraint=models.CheckConstraint(
                condition=models.Q(('status__in', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])),
                name='ck_payment_status_valid',
            ),
        ),
    ]
