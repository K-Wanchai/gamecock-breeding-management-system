from django.contrib import admin

from apps.vaccinations.models import Vaccination


@admin.register(Vaccination)
class VaccinationAdmin(admin.ModelAdmin):
    list_display = ('chick', 'vaccine_name', 'vaccination_date', 'dose_number', 'age_days', 'recorded_by')
