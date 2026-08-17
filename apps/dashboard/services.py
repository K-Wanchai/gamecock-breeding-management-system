"""
Read-only aggregation for the customer dashboard (STEP18). No model of its own —
this just composes counts/sums over Booking/Chick, which already carry the real data
and ownership chain. Kept out of views.py per Global Rule #16 even though it's a pure
read, for consistency with every other app in this project.
"""

from decimal import Decimal

from django.db.models import Count, Sum

from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.chicks.models import Chick

# A booking with money still owed but already CANCELLED/REJECTED isn't really
# "outstanding" — nothing further will ever be paid against it.
_TERMINAL_NON_PAYABLE_STATUSES = (Booking.Status.CANCELLED, Booking.Status.REJECTED)


def get_customer_dashboard_summary(user: User) -> dict:
    bookings = Booking.objects.filter(customer=user)

    booking_counts = {status.value: 0 for status in Booking.Status}
    for row in bookings.values('status').annotate(count=Count('id')):
        booking_counts[row['status']] = row['count']

    chick_count = Chick.objects.filter(hatching__egg__booking__customer=user).count()

    outstanding_total = bookings.filter(remaining_amount__gt=0).exclude(
        status__in=_TERMINAL_NON_PAYABLE_STATUSES,
    ).aggregate(total=Sum('remaining_amount'))['total'] or Decimal('0.00')

    return {
        'booking_counts': booking_counts,
        'chick_count': chick_count,
        'outstanding_payment_total': outstanding_total,
    }
