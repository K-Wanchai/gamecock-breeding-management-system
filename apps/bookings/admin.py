from django.contrib import admin

from apps.bookings.models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'customer', 'hen', 'breeder', 'booking_year', 'booking_month',
        'queue_no', 'status', 'balance_due',
    )
    list_filter = ('status', 'booking_year', 'booking_month')
    search_fields = ('hen__name', 'customer__username', 'breeder__name')
    readonly_fields = ('public_uuid',)
