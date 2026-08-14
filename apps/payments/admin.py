from django.contrib import admin

from apps.payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_number', 'booking', 'payment_type', 'amount', 'status', 'verified_by')
    list_filter = ('payment_type', 'status')
    search_fields = ('payment_number', 'booking__booking_number')
    readonly_fields = ('payment_number',)
