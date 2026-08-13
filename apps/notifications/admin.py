from django.contrib import admin

from apps.notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'notif_type', 'channel', 'status', 'sent_at')
    list_filter = ('status', 'channel', 'notif_type')
