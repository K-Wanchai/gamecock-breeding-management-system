from django.contrib import admin

from apps.breeding.models import BreedingTimeline, Egg


@admin.register(BreedingTimeline)
class BreedingTimelineAdmin(admin.ModelAdmin):
    list_display = ('booking', 'stage', 'event_date', 'recorded_by')
    list_filter = ('stage',)


@admin.register(Egg)
class EggAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'lay_date', 'egg_count', 'recorded_by')
