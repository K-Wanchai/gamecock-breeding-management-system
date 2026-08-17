"""
Business logic for Booking (STEP5). Kept out of views.py per Global Rule #16.
Every state-changing operation here runs inside transaction.atomic() and, where
concurrent requests could race (queue locking), uses select_for_update() — Global
Rules #18/#19.
"""

from decimal import Decimal, ROUND_HALF_UP

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from apps.breeders.models import Breeder, BreederMonthlyQuota
from apps.core.exceptions import AppError
from apps.core.services import format_booking_number, next_running_number
from apps.hens.models import Hen

from apps.bookings.models import Booking

# Business policy: the deposit is 30% of the breeder's service rate. Not given a
# concrete number by the spec, so this is a documented assumption, not a magic number
# scattered through the code — change it here if the real policy differs.
DEPOSIT_PERCENT = Decimal('30')


def calculate_booking_amount(breeder: Breeder) -> tuple[Decimal, Decimal]:
    """Returns (price, deposit_amount) snapshot from the breeder's current service_rate.
    Price is never accepted from the client (Critical Rule #15)."""
    price = breeder.service_rate
    deposit_amount = (price * DEPOSIT_PERCENT / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return price, deposit_amount


def check_booking_availability(*, customer, hen: Hen, breeder: Breeder, booking_date) -> None:
    """
    Raises AppError if this booking cannot be created. Called as a friendly pre-check
    by create_booking() and re-checked inside its transaction (Global Rule #17) — the
    authoritative race guard is still the DB partial-unique constraint on Booking.hen.
    """
    if hen.owner_id != customer.id:
        raise AppError('HEN_NOT_OWNED', 'You may only book with a hen you own.', http_status=403)
    if hen.status != Hen.Status.ACTIVE:
        raise AppError('HEN_INACTIVE', 'This hen is not active.', http_status=422)
    if breeder.status != Breeder.Status.ACTIVE:
        raise AppError('BREEDER_INACTIVE', 'This breeder is not currently accepting bookings.', http_status=422)
    if breeder.service_start_date and booking_date < breeder.service_start_date:
        raise AppError(
            'BOOKING_DATE_BEFORE_SERVICE_START', 'This breeder does not accept bookings before its service start date.',
            http_status=422,
        )
    if booking_date < timezone.localdate():
        raise AppError('BOOKING_DATE_IN_PAST', 'booking_date must not be in the past.', http_status=422)
    if Booking.objects.filter(hen=hen, status__in=Booking.ACTIVE_STATUSES).exists():
        raise AppError('HEN_ALREADY_BOOKED', 'This hen already has an active booking.', http_status=409)


@transaction.atomic
def create_booking(*, customer, hen: Hen, breeder: Breeder, booking_date, note: str = '') -> Booking:
    check_booking_availability(customer=customer, hen=hen, breeder=breeder, booking_date=booking_date)

    price, deposit_amount = calculate_booking_amount(breeder)
    year, month = booking_date.year, booking_date.month
    booking_number = format_booking_number(year, next_running_number('BOOKING_QUEUE', year))

    try:
        with transaction.atomic():
            return Booking.objects.create(
                customer=customer, hen=hen, breeder=breeder,
                booking_date=booking_date, booking_year=year, booking_month=month,
                price=price, deposit_amount=deposit_amount, paid_amount=Decimal('0'), remaining_amount=price,
                status=Booking.Status.WAITING_PAYMENT, note=note or '', booking_number=booking_number,
            )
    except IntegrityError:
        # Two concurrent requests both passed the pre-check above; the DB partial unique
        # index on (hen, active-status) is the real race guard (Critical Rules #3/#4).
        raise AppError('HEN_ALREADY_BOOKED', 'This hen already has an active booking.', http_status=409)


def lock_booking_slot(booking: Booking) -> Booking:
    """
    Assigns queue_no under a row lock on BreederMonthlyQuota, serializing concurrent
    approvals for the same (breeder, year, month) — Critical Rules #2/#3/#5, Global
    Rule #19. Must be called from inside an existing transaction.atomic() block.
    """
    assert transaction.get_connection().in_atomic_block, 'lock_booking_slot() must run inside transaction.atomic()'

    quota, _ = BreederMonthlyQuota.objects.select_for_update().get_or_create(
        breeder=booking.breeder, year=booking.booking_year, month=booking.booking_month,
        defaults={'max_slots': booking.breeder.default_monthly_quota, 'is_open': True},
    )
    if not quota.is_open:
        raise AppError('QUEUE_CLOSED', 'This breeder is not accepting bookings for that month.', http_status=409)

    locked_qs = Booking.objects.select_for_update().filter(
        breeder=booking.breeder, booking_year=booking.booking_year, booking_month=booking.booking_month,
        queue_no__isnull=False,
    )
    if locked_qs.count() >= quota.max_slots:
        raise AppError('QUEUE_FULL', "This breeder's queue is full for that month.", http_status=409)

    next_no = (locked_qs.aggregate(Max('queue_no'))['queue_no__max'] or 0) + 1
    booking.queue_no = next_no
    booking.locked_at = timezone.now()
    booking.save(update_fields=['queue_no', 'locked_at', 'updated_at'])
    return booking


@transaction.atomic
def approve_booking(*, booking_id, admin) -> Booking:
    try:
        booking = Booking.objects.select_for_update().select_related('breeder').get(pk=booking_id)
    except Booking.DoesNotExist:
        raise AppError('NOT_FOUND', 'Booking not found.', http_status=404)

    if booking.status != Booking.Status.PAID:
        raise AppError(
            'INVALID_STATE_TRANSITION', f'Booking must be PAID before it can be approved (current: {booking.status}).',
            http_status=422,
        )

    lock_booking_slot(booking)
    booking.status = Booking.Status.APPROVED
    booking.approved_by = admin
    booking.approved_at = timezone.now()
    booking.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])

    from apps.notifications import services as notification_services  # local import: avoids a module-load-time cycle
    transaction.on_commit(lambda: notification_services.notify_booking_approved(booking))

    return booking


@transaction.atomic
def cancel_booking(*, booking_id, actor, reason: str = '') -> Booking:
    from apps.payments.models import Payment  # local import: avoids a module-load-time cycle with payments.models

    try:
        booking = Booking.objects.select_for_update().get(pk=booking_id)
    except Booking.DoesNotExist:
        raise AppError('NOT_FOUND', 'Booking not found.', http_status=404)

    is_admin = actor.role == actor.Role.ADMIN
    if not is_admin and booking.customer_id != actor.id:
        raise AppError('FORBIDDEN', 'You may only cancel your own booking.', http_status=403)

    if booking.status in (Booking.Status.COMPLETED, Booking.Status.CANCELLED, Booking.Status.REJECTED):
        raise AppError('BOOKING_NOT_CANCELLABLE', f'Booking is already {booking.status} and cannot be cancelled.', http_status=422)

    if not is_admin and booking.status not in (Booking.Status.PENDING, Booking.Status.WAITING_PAYMENT, Booking.Status.PAID):
        raise AppError(
            'BOOKING_ALREADY_APPROVED', 'This booking has already been approved; contact an administrator to cancel it.',
            http_status=422,
        )

    booking.status = Booking.Status.CANCELLED
    booking.cancelled_by = actor
    booking.cancelled_at = timezone.now()
    booking.cancel_reason = reason or ''
    booking.queue_no = None  # release the slot, if one had been locked, so it can be reassigned
    booking.save(update_fields=['status', 'cancelled_by', 'cancelled_at', 'cancel_reason', 'queue_no', 'updated_at'])

    # A cancelled booking must never end up with an approved payment later (Critical
    # Rule #7) — any submission still awaiting review is cancelled along with it.
    booking.payments.filter(status=Payment.Status.PENDING).update(status=Payment.Status.CANCELLED)

    from apps.notifications import services as notification_services  # local import: avoids a module-load-time cycle
    transaction.on_commit(lambda: notification_services.notify_booking_cancelled(booking))

    return booking
