from django.contrib import admin

from apps.breeding.models import BreedingEvent, Egg


@admin.register(BreedingEvent)
class BreedingEventAdmin(admin.ModelAdmin):
    list_display = ('booking', 'status', 'event_date', 'recorded_by')
    list_filter = ('status',)


@admin.register(Egg)
class EggAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'egg_date', 'total_eggs', 'good_eggs', 'bad_eggs', 'recorded_by')
