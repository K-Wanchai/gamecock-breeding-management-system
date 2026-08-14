from django.contrib import admin

from apps.bookings.models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'booking_number', 'customer', 'hen', 'breeder', 'booking_year', 'booking_month',
        'queue_no', 'status', 'remaining_amount',
    )
    list_filter = ('status', 'booking_year', 'booking_month')
    search_fields = ('booking_number', 'hen__name', 'customer__username', 'breeder__name')
    readonly_fields = ('public_uuid', 'booking_number')
