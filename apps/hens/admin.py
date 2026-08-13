from django.contrib import admin

from apps.hens.models import Hen


@admin.register(Hen)
class HenAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'breed', 'status')
    list_filter = ('status',)
    search_fields = ('name', 'owner__username')
