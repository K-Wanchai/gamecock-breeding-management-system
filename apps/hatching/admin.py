from django.contrib import admin

from apps.hatching.models import Hatching


@admin.register(Hatching)
class HatchingAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'egg', 'status', 'total_eggs', 'hatched_count', 'failed_count', 'survival_count',
        'started_at', 'completed_at',
    )
    list_filter = ('status',)
