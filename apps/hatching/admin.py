from django.contrib import admin

from apps.hatching.models import Hatching


@admin.register(Hatching)
class HatchingAdmin(admin.ModelAdmin):
    list_display = ('id', 'egg', 'status', 'hatched_count', 'hatch_start_date', 'hatch_end_date')
    list_filter = ('status',)
