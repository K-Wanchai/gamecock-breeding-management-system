from django.contrib import admin

from apps.chicks.models import Chick


@admin.register(Chick)
class ChickAdmin(admin.ModelAdmin):
    list_display = ('wing_clip_number', 'hatching', 'hatch_date', 'gender', 'status')
    list_filter = ('status', 'gender')
    search_fields = ('wing_clip_number',)
