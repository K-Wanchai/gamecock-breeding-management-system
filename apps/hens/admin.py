from django.contrib import admin

from apps.hens.models import Hen


@admin.register(Hen)
class HenAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'breed', 'age_months', 'status')
    list_filter = ('status', 'breed')
    search_fields = ('name', 'owner__username', 'breed', 'bloodline')
