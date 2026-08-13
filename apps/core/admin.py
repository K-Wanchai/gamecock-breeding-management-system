from django.contrib import admin

from apps.core.models import RunningNumberCounter


@admin.register(RunningNumberCounter)
class RunningNumberCounterAdmin(admin.ModelAdmin):
    list_display = ('counter_type', 'year', 'last_number', 'updated_at')
    list_filter = ('counter_type', 'year')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
