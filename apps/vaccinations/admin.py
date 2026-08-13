from django.contrib import admin

from apps.vaccinations.models import Vaccination


@admin.register(Vaccination)
class VaccinationAdmin(admin.ModelAdmin):
    list_display = ('chick', 'vaccine_name', 'vaccine_date', 'next_due_date', 'administered_by')
