from django.contrib import admin

from apps.payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'payment_type', 'amount', 'status', 'reviewed_by')
    list_filter = ('payment_type', 'status')
