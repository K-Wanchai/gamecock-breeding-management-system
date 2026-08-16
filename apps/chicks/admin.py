from django.contrib import admin

from apps.chicks.models import Chick


@admin.register(Chick)
class ChickAdmin(admin.ModelAdmin):
    list_display = ('wing_clip_number', 'name', 'hatching', 'booking', 'birth_date', 'gender', 'status')
    list_filter = ('status', 'gender')
    search_fields = ('wing_clip_number', 'name')
