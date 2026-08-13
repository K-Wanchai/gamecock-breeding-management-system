from django.contrib import admin

from apps.health.models import HealthRecord


@admin.register(HealthRecord)
class HealthRecordAdmin(admin.ModelAdmin):
    list_display = ('chick', 'record_date', 'weight_grams', 'health_status', 'recorded_by')
