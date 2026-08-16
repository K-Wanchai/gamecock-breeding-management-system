from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vaccinations', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(model_name='vaccination', name='next_due_date'),
        migrations.RemoveField(model_name='vaccination', name='dose'),
        migrations.RenameField(model_name='vaccination', old_name='vaccine_date', new_name='vaccination_date'),
        migrations.RenameField(model_name='vaccination', old_name='administered_by', new_name='recorded_by'),
        migrations.RenameField(model_name='vaccination', old_name='note', new_name='remark'),
        migrations.AlterModelOptions(name='vaccination', options={'ordering': ['vaccination_date']}),
        migrations.AlterField(
            model_name='vaccination',
            name='recorded_by',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name='vaccinations_recorded',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='vaccination', name='dose_number',
            field=models.SmallIntegerField(default=1), preserve_default=False,
        ),
        migrations.AddField(
            model_name='vaccination', name='age_days', field=models.SmallIntegerField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name='vaccination',
            constraint=models.CheckConstraint(
                condition=models.Q(('dose_number__gte', 1)), name='ck_vaccination_dose_number_gte_1',
            ),
        ),
        migrations.AddConstraint(
            model_name='vaccination',
            constraint=models.CheckConstraint(
                condition=models.Q(('age_days__gte', 0)), name='ck_vaccination_age_days_gte_0',
            ),
        ),
        migrations.AddConstraint(
            model_name='vaccination',
            constraint=models.UniqueConstraint(
                fields=('chick', 'vaccine_name', 'dose_number'), name='uq_vaccination_chick_vaccine_dose',
            ),
        ),
    ]
