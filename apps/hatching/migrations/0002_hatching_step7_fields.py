import datetime

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hatching', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(model_name='hatching', old_name='hatch_start_date', new_name='started_at'),
        migrations.RenameField(model_name='hatching', old_name='hatch_end_date', new_name='completed_at'),
        migrations.RenameField(model_name='hatching', old_name='note', new_name='remark'),
        migrations.AlterField(
            model_name='hatching', name='started_at',
            field=models.DateField(default=datetime.date(2026, 1, 1)), preserve_default=False,
        ),
        migrations.AddField(
            model_name='hatching', name='total_eggs',
            field=models.SmallIntegerField(default=0), preserve_default=False,
        ),
        migrations.AddField(model_name='hatching', name='failed_count', field=models.SmallIntegerField(default=0)),
        migrations.AddField(model_name='hatching', name='survival_count', field=models.SmallIntegerField(default=0)),
        migrations.AlterModelOptions(name='hatching', options={'ordering': ['-started_at', '-id']}),
        migrations.RemoveConstraint(model_name='hatching', name='ck_hatching_count_gte_0'),
        migrations.AddConstraint(
            model_name='hatching',
            constraint=models.CheckConstraint(condition=models.Q(('total_eggs__gte', 0)), name='ck_hatching_total_eggs_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='hatching',
            constraint=models.CheckConstraint(
                condition=models.Q(('hatched_count__gte', 0)), name='ck_hatching_hatched_count_gte_0',
            ),
        ),
        migrations.AddConstraint(
            model_name='hatching',
            constraint=models.CheckConstraint(condition=models.Q(('failed_count__gte', 0)), name='ck_hatching_failed_count_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='hatching',
            constraint=models.CheckConstraint(
                condition=models.Q(('survival_count__gte', 0)), name='ck_hatching_survival_count_gte_0',
            ),
        ),
        migrations.AddConstraint(
            model_name='hatching',
            constraint=models.CheckConstraint(
                condition=models.Q(('total_eggs__gte', models.F('hatched_count') + models.F('failed_count'))),
                name='ck_hatching_hatched_plus_failed_lte_total',
            ),
        ),
        migrations.AddConstraint(
            model_name='hatching',
            constraint=models.CheckConstraint(
                condition=models.Q(('hatched_count__gte', models.F('survival_count'))),
                name='ck_hatching_survival_lte_hatched',
            ),
        ),
        migrations.AddConstraint(
            model_name='hatching',
            constraint=models.CheckConstraint(
                condition=models.Q(('completed_at__isnull', True)) | models.Q(('completed_at__gte', models.F('started_at'))),
                name='ck_hatching_completed_not_before_started',
            ),
        ),
    ]
