from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.accounts.models import User


@admin.register(User)
class AppUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'phone', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Gamecock system fields', {'fields': ('role', 'phone', 'line_user_id')}),
    )
