import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


BREEDING_EVENT_STATUS_CHOICES = [
    ('RECEIVED', 'รับแม่ไก่เข้าฟาร์ม'),
    ('BREEDING', 'กำลังผสมพันธุ์'),
    ('BREEDING_COMPLETED', 'ผสมพันธุ์เสร็จสิ้น'),
    ('WAITING_EGG', 'รอออกไข่'),
    ('EGG_LAID', 'ออกไข่แล้ว'),
    ('INCUBATION', 'เข้าตู้ฟัก'),
    ('HATCHING', 'ฟักไข่'),
]


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_booking_step5_fields'),
        ('breeding', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # --- BreedingTimeline -> BreedingEvent, stage -> status (STEP6 7-stage flow) ---
        migrations.RemoveConstraint(model_name='breedingtimeline', name='uq_timeline_booking_stage'),
        migrations.RenameModel(old_name='BreedingTimeline', new_name='BreedingEvent'),
        migrations.RenameField(model_name='breedingevent', old_name='stage', new_name='status'),
        migrations.RenameField(model_name='breedingevent', old_name='note', new_name='description'),
        migrations.AlterField(
            model_name='breedingevent',
            name='status',
            field=models.CharField(choices=BREEDING_EVENT_STATUS_CHOICES, db_index=True, max_length=20),
        ),
        migrations.AlterModelOptions(name='breedingevent', options={'ordering': ['event_date', 'id']}),
        migrations.AlterField(
            model_name='breedingevent',
            name='booking',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, related_name='breeding_events', to='bookings.booking',
            ),
        ),
        migrations.AlterField(
            model_name='breedingevent',
            name='recorded_by',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name='breeding_events_recorded',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name='breedingevent',
            constraint=models.UniqueConstraint(
                fields=('booking', 'status'), name='uq_breeding_event_booking_status',
            ),
        ),

        # --- Egg: lay_date/egg_count/note -> egg_date/total_eggs/remark + good/bad breakdown ---
        migrations.RemoveConstraint(model_name='egg', name='ck_egg_count_gte_0'),
        migrations.RenameField(model_name='egg', old_name='lay_date', new_name='egg_date'),
        migrations.RenameField(model_name='egg', old_name='egg_count', new_name='total_eggs'),
        migrations.RenameField(model_name='egg', old_name='note', new_name='remark'),
        migrations.AddField(model_name='egg', name='good_eggs', field=models.SmallIntegerField(default=0)),
        migrations.AddField(model_name='egg', name='bad_eggs', field=models.SmallIntegerField(default=0)),
        migrations.AddField(model_name='egg', name='incubation_date', field=models.DateField(blank=True, null=True)),
        migrations.AlterModelOptions(name='egg', options={'ordering': ['-egg_date', '-id']}),
        migrations.AddConstraint(
            model_name='egg',
            constraint=models.CheckConstraint(condition=models.Q(('total_eggs__gte', 0)), name='ck_egg_total_eggs_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='egg',
            constraint=models.CheckConstraint(condition=models.Q(('good_eggs__gte', 0)), name='ck_egg_good_eggs_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='egg',
            constraint=models.CheckConstraint(condition=models.Q(('bad_eggs__gte', 0)), name='ck_egg_bad_eggs_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='egg',
            constraint=models.CheckConstraint(
                condition=models.Q(('total_eggs__gte', models.F('good_eggs') + models.F('bad_eggs'))),
                name='ck_egg_good_plus_bad_lte_total',
            ),
        ),
    ]
