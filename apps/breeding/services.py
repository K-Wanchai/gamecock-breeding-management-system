"""
Business logic for the breeding-process timeline and egg tracking (STEP6).
Kept out of views.py per Global Rule #16. State-changing operations run inside
transaction.atomic() and take select_for_update() on the parent Booking row
(Global Rules #18/#19) so two concurrent submissions for the same booking can
never both succeed in creating the same next event.
"""

from decimal import ROUND_HALF_UP, Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.bookings.models import Booking
from apps.core.exceptions import AppError

from apps.breeding.models import BreedingEvent, Egg, InseminationRecord

# A breeding event may only be recorded once a booking has been admin-approved
# and while it is still an active, non-cancelled process (Rules: "ห้าม Booking
# ยังไม่ Approved -> เริ่ม Breeding", "ห้าม Booking Cancelled -> เริ่ม Breeding").
_BOOKING_ALLOWED_STATUSES = (Booking.Status.APPROVED, Booking.Status.IN_PROGRESS)
_BOOKING_TERMINAL_STATUSES = (Booking.Status.CANCELLED, Booking.Status.REJECTED)

# Ordered breeding-process state machine (STEP6 flow). Key is the current status
# of the last recorded event for a booking (None = no event yet); value is the
# single allowed next status. HATCHING is terminal (no further event allowed).
BREEDING_TRANSITIONS = {
    None: BreedingEvent.Status.RECEIVED,
    BreedingEvent.Status.RECEIVED: BreedingEvent.Status.BREEDING,
    BreedingEvent.Status.BREEDING: BreedingEvent.Status.BREEDING_COMPLETED,
    BreedingEvent.Status.BREEDING_COMPLETED: BreedingEvent.Status.WAITING_EGG,
    BreedingEvent.Status.WAITING_EGG: BreedingEvent.Status.EGG_LAID,
    BreedingEvent.Status.EGG_LAID: BreedingEvent.Status.INCUBATION,
    BreedingEvent.Status.INCUBATION: BreedingEvent.Status.HATCHING,
    BreedingEvent.Status.HATCHING: None,
}


def _check_booking_open_for_breeding(booking: Booking) -> None:
    if booking.status in _BOOKING_TERMINAL_STATUSES:
        raise AppError(
            'BOOKING_CANCELLED', 'Cannot record a breeding event for a cancelled/rejected booking.',
            http_status=422,
        )
    if booking.status not in _BOOKING_ALLOWED_STATUSES:
        raise AppError(
            'BOOKING_NOT_APPROVED', 'Booking must be approved before breeding events can be recorded.',
            http_status=422,
        )


def transition_breeding_status(*, current_status, new_status: str) -> None:
    """
    Raises AppError unless `new_status` is the single allowed next stage after
    `current_status` (STEP6 allowed-transition rule — no skipping stages).
    """
    expected_next = BREEDING_TRANSITIONS.get(current_status, '__unknown_status__')
    if expected_next is None or new_status != expected_next:
        raise AppError(
            'INVALID_BREEDING_TRANSITION',
            f'Cannot transition from {current_status or "(no event yet)"} to {new_status}. '
            f'Expected next status: {expected_next or "(none — process already complete)"}.',
            http_status=422,
        )


@transaction.atomic
def record_breeding_event(*, booking_id, status: str, event_date, description: str = '', recorded_by) -> BreedingEvent:
    try:
        booking = Booking.objects.select_for_update().get(pk=booking_id)
    except Booking.DoesNotExist:
        raise AppError('NOT_FOUND', 'Booking not found.', http_status=404)

    _check_booking_open_for_breeding(booking)

    if event_date > timezone.localdate():
        raise AppError('EVENT_DATE_IN_FUTURE', 'event_date must not be in the future.', http_status=422)

    last_event = booking.breeding_events.order_by('-event_date', '-id').first()
    if last_event and event_date < last_event.event_date:
        raise AppError(
            'EVENT_DATE_BEFORE_PREVIOUS', 'event_date cannot be earlier than the previous breeding event.',
            http_status=422,
        )

    current_status = last_event.status if last_event else None
    transition_breeding_status(current_status=current_status, new_status=status)

    try:
        with transaction.atomic():
            event = BreedingEvent.objects.create(
                booking=booking, status=status, event_date=event_date,
                description=description or '', recorded_by=recorded_by,
            )
    except IntegrityError:
        raise AppError(
            'DUPLICATE_BREEDING_EVENT', 'This breeding status has already been recorded for this booking.',
            http_status=409,
        )

    # Move booking to IN_PROGRESS on the first event so it leaves the APPROVED queue
    if booking.status == Booking.Status.APPROVED:
        booking.status = Booking.Status.IN_PROGRESS
        booking.save(update_fields=['status', 'updated_at'])

    from apps.notifications import services as notification_services
    transaction.on_commit(lambda: notification_services.notify_breeding_event(event))
    return event


@transaction.atomic
def record_egg(
    *, booking_id, total_eggs: int, good_eggs: int = 0, bad_eggs: int = 0,
    egg_date, incubation_date=None, remark: str = '', recorded_by,
) -> Egg:
    try:
        booking = Booking.objects.select_for_update().get(pk=booking_id)
    except Booking.DoesNotExist:
        raise AppError('NOT_FOUND', 'Booking not found.', http_status=404)

    _check_booking_open_for_breeding(booking)

    if booking.hen_brooding:
        raise AppError('HEN_BROODING', 'Cannot record eggs after hen has started brooding.', http_status=422)

    if total_eggs < 0 or good_eggs < 0 or bad_eggs < 0:
        raise AppError('INVALID_EGG_COUNT', 'Egg counts must not be negative.', http_status=422)
    if good_eggs + bad_eggs > total_eggs:
        raise AppError('INVALID_EGG_COUNT', 'good_eggs + bad_eggs must not exceed total_eggs.', http_status=422)

    today = timezone.localdate()
    if egg_date > today:
        raise AppError('EGG_DATE_IN_FUTURE', 'egg_date must not be in the future.', http_status=422)
    if incubation_date is not None and incubation_date < egg_date:
        raise AppError(
            'INCUBATION_DATE_BEFORE_EGG_DATE', 'incubation_date cannot be earlier than egg_date.', http_status=422,
        )

    return Egg.objects.create(
        booking=booking, total_eggs=total_eggs, good_eggs=good_eggs, bad_eggs=bad_eggs,
        egg_date=egg_date, incubation_date=incubation_date, remark=remark or '', recorded_by=recorded_by,
    )


@transaction.atomic
def create_insemination_record(
    *, booking_id, record_date, note: str = '', recorded_by,
) -> InseminationRecord:
    """
    Creates one insemination session record for the booking. session_number is
    always server-computed (max existing + 1, starting at 1) so the client cannot
    forge or reorder sessions. Blocked once booking.hen_brooding is True.
    """
    try:
        booking = Booking.objects.select_for_update().get(pk=booking_id)
    except Booking.DoesNotExist:
        raise AppError('NOT_FOUND', 'Booking not found.', http_status=404)

    _check_booking_open_for_breeding(booking)

    if booking.hen_brooding:
        raise AppError(
            'HEN_BROODING', 'Cannot record insemination after hen has started brooding.', http_status=422,
        )

    if record_date > timezone.localdate():
        raise AppError('RECORD_DATE_IN_FUTURE', 'record_date must not be in the future.', http_status=422)

    last = InseminationRecord.objects.filter(booking=booking).order_by('-session_number').first()
    session_number = (last.session_number + 1) if last else 1

    # Move booking to IN_PROGRESS on first insemination (mirrors record_breeding_event behaviour).
    if booking.status == Booking.Status.APPROVED:
        booking.status = Booking.Status.IN_PROGRESS
        booking.save(update_fields=['status', 'updated_at'])

    return InseminationRecord.objects.create(
        booking=booking, session_number=session_number,
        record_date=record_date, note=note or '', recorded_by=recorded_by,
    )


def calculate_good_egg_rate(egg: Egg) -> Decimal:
    """Good-egg rate as a percentage (0.00-100.00), 2 decimal places. 0 when total_eggs is 0."""
    if egg.total_eggs == 0:
        return Decimal('0.00')
    rate = Decimal(egg.good_eggs) / Decimal(egg.total_eggs) * Decimal('100')
    return rate.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
