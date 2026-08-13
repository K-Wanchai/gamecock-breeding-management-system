from django.contrib import admin

from apps.breeders.models import Breeder, BreederMonthlyQuota


class BreederMonthlyQuotaInline(admin.TabularInline):
    model = BreederMonthlyQuota
    extra = 0


@admin.register(Breeder)
class BreederAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'service_rate', 'default_monthly_quota', 'created_by')
    list_filter = ('status',)
    search_fields = ('name',)
    inlines = [BreederMonthlyQuotaInline]


@admin.register(BreederMonthlyQuota)
class BreederMonthlyQuotaAdmin(admin.ModelAdmin):
    list_display = ('breeder', 'year', 'month', 'max_slots', 'is_open')
    list_filter = ('year', 'month', 'is_open')
