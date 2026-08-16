from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('health', '0001_initial'),
    ]

    operations = [
        migrations.RemoveConstraint(model_name='healthrecord', name='ck_health_weight_gte_0'),
        migrations.RenameField(model_name='healthrecord', old_name='weight_grams', new_name='weight'),
        migrations.RenameField(model_name='healthrecord', old_name='health_status', new_name='observation'),
        migrations.RenameField(model_name='healthrecord', old_name='treatment_note', new_name='remark'),
        migrations.AlterField(
            model_name='healthrecord', name='observation', field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(model_name='healthrecord', name='medicine', field=models.TextField(blank=True, null=True)),
        migrations.AddConstraint(
            model_name='healthrecord',
            constraint=models.CheckConstraint(condition=models.Q(('weight__gte', 0)), name='ck_health_weight_gte_0'),
        ),
    ]
