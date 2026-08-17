"""
Summary aggregation for the STEP9 report/dashboard endpoints. Every function
here takes an already-filtered queryset and returns a plain dict computed via
.aggregate()/.values().annotate() — never a Python loop over fetched rows
(Global Rule #41 N+1 avoidance applies to aggregation too: looping in Python
would force-fetch every row just to sum/count it).
"""

from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.breeding.models import BreedingEvent
from apps.chicks.models import Chick
from apps.hatching.models import Hatching
from apps.hens.models import Hen
from apps.payments.models import Payment


def _rate(numerator, denominator) -> Decimal:
    if not denominator:
        return Decimal('0.00')
    return (Decimal(numerator) / Decimal(denominator) * Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _count_by(queryset, field: str) -> dict:
    return {row[field]: row['count'] for row in queryset.values(field).annotate(count=Count('id')).order_by(field)}


def booking_summary(queryset) -> dict:
    totals = queryset.aggregate(total=Count('id'), total_price=Sum('price'))
    return {
        'total': totals['total'],
        'total_price': totals['total_price'] or Decimal('0'),
        'by_status': _count_by(queryset, 'status'),
    }


def payment_summary(queryset) -> dict:
    totals = queryset.aggregate(total=Count('id'), total_amount=Sum('amount'))
    return {
        'total': totals['total'],
        'total_amount': totals['total_amount'] or Decimal('0'),
        'by_status': _count_by(queryset, 'status'),
    }


def revenue_summary(queryset) -> dict:
    """`queryset` is already scoped to Payment.Status.APPROVED by the view."""
    totals = queryset.aggregate(total=Count('id'), total_amount=Sum('amount'))
    by_month = list(
        queryset.annotate(month=TruncMonth('verified_at')).values('month')
        .annotate(total=Sum('amount')).order_by('month')
    )
    by_breeder = list(
        queryset.values(breeder_name=F('booking__breeder__name')).annotate(total=Sum('amount'))
        .order_by('-total')[:10]
    )
    return {
        'total': totals['total'],
        'total_amount': totals['total_amount'] or Decimal('0'),
        'by_month': by_month,
        'by_breeder': by_breeder,
    }


def breeding_summary(queryset) -> dict:
    return {
        'total': queryset.count(),
        'by_status': _count_by(queryset, 'status'),
    }


def egg_summary(queryset) -> dict:
    totals = queryset.aggregate(total_eggs=Sum('total_eggs'), good_eggs=Sum('good_eggs'), bad_eggs=Sum('bad_eggs'))
    total_eggs = totals['total_eggs'] or 0
    good_eggs = totals['good_eggs'] or 0
    return {
        'total_batches': queryset.count(),
        'total_eggs': total_eggs,
        'good_eggs': good_eggs,
        'bad_eggs': totals['bad_eggs'] or 0,
        'good_egg_rate': _rate(good_eggs, total_eggs),
    }


def hatching_summary(queryset) -> dict:
    totals = queryset.aggregate(
        total_eggs=Sum('total_eggs'), hatched_count=Sum('hatched_count'),
        failed_count=Sum('failed_count'), survival_count=Sum('survival_count'),
    )
    total_eggs = totals['total_eggs'] or 0
    hatched_count = totals['hatched_count'] or 0
    return {
        'total_batches': queryset.count(),
        'total_eggs': total_eggs,
        'hatched_count': hatched_count,
        'failed_count': totals['failed_count'] or 0,
        'survival_count': totals['survival_count'] or 0,
        'hatching_rate': _rate(hatched_count, total_eggs),
        'by_status': _count_by(queryset, 'status'),
    }


def chick_summary(queryset) -> dict:
    return {
        'total': queryset.count(),
        'by_status': _count_by(queryset, 'status'),
        'by_gender': _count_by(queryset, 'gender'),
    }


def get_dashboard_data(*, user) -> dict:
    now = timezone.now()
    today = now.date()
    month_start = today.replace(day=1)

    if user.role == user.Role.ADMIN:
        bookings = Booking.objects.all()
        payments = Payment.objects.all()
        recent_bookings = Booking.objects.select_related('customer', 'hen', 'breeder').order_by('-created_at')[:5]
        pending_payments = payments.filter(status=Payment.Status.PENDING)
        revenue_this_month = payments.filter(
            status=Payment.Status.APPROVED, verified_at__date__gte=month_start,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        revenue_this_year = payments.filter(
            status=Payment.Status.APPROVED, verified_at__year=today.year,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        return {
            'role': 'ADMIN',
            'as_of': now,
            'bookings': {
                'total': bookings.count(),
                'this_month': bookings.filter(booking_date__gte=month_start).count(),
                'by_status': _count_by(bookings, 'status'),
            },
            'payments': {
                'pending_count': pending_payments.count(),
                'pending_amount': pending_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0'),
            },
            'revenue': {'this_month': revenue_this_month, 'this_year': revenue_this_year},
            'breeders': {'active': Breeder.objects.filter(status=Breeder.Status.ACTIVE).count()},
            'breeding': {'in_progress': _breeding_in_progress_count()},
            'hatching': {'incubating': Hatching.objects.filter(status=Hatching.Status.INCUBATING).count()},
            'chicks': {'alive': Chick.objects.filter(status=Chick.Status.ALIVE).count()},
            'recent_bookings': recent_bookings,
        }

    bookings = Booking.objects.filter(customer=user)
    payments = Payment.objects.filter(booking__customer=user)
    recent_bookings = bookings.select_related('customer', 'hen', 'breeder').order_by('-created_at')[:5]
    pending_payments = payments.filter(status=Payment.Status.PENDING)
    return {
        'role': 'CUSTOMER',
        'as_of': now,
        'bookings': {'total': bookings.count(), 'by_status': _count_by(bookings, 'status')},
        'payments': {'pending_count': pending_payments.count()},
        'hens': {'total': user.hens.count(), 'active': user.hens.filter(status=Hen.Status.ACTIVE).count()},
        'chicks': {'total': Chick.objects.filter(booking__customer=user).count()},
        'recent_bookings': recent_bookings,
    }


def _breeding_in_progress_count() -> int:
    """Bookings that have started the breeding-event timeline but have not yet
    reached its terminal HATCHING stage (apps.breeding.services.BREEDING_TRANSITIONS)."""
    bookings_reached_hatching = BreedingEvent.objects.filter(status=BreedingEvent.Status.HATCHING).values('booking')
    return BreedingEvent.objects.exclude(booking__in=bookings_reached_hatching).values('booking').distinct().count()
