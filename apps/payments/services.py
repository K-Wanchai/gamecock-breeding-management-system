"""Business logic for Payment (STEP5). Kept out of views.py per Global Rule #16."""

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.bookings.models import Booking
from apps.core.exceptions import AppError
from apps.core.services import format_payment_number, next_running_number

from apps.payments.models import Payment

_BOOKING_NOT_PAYABLE_STATUSES = (Booking.Status.CANCELLED, Booking.Status.REJECTED, Booking.Status.COMPLETED)


@transaction.atomic
def create_payment(*, customer, booking: Booking, payment_type: str, amount, slip, paid_at) -> Payment:
    booking = Booking.objects.select_for_update().get(pk=booking.pk)

    if booking.customer_id != customer.id:
        raise AppError('FORBIDDEN', 'You may only submit payments for your own booking.', http_status=403)
    if booking.status in _BOOKING_NOT_PAYABLE_STATUSES:
        raise AppError('BOOKING_NOT_PAYABLE', f'This booking is {booking.status} and cannot accept payments.', http_status=422)

    if amount > booking.remaining_amount:
        raise AppError('OVERPAYMENT', 'Payment amount exceeds the remaining balance on this booking.', http_status=422)
    if payment_type == Payment.PaymentType.DEPOSIT and booking.paid_amount == 0 and amount < booking.deposit_amount:
        raise AppError(
            'UNDERPAYMENT', f'Deposit payment must be at least {booking.deposit_amount}.', http_status=422,
        )

    year = timezone.localdate().year
    payment_number = format_payment_number(year, next_running_number('PAYMENT_NO', year))

    try:
        with transaction.atomic():
            return Payment.objects.create(
                booking=booking, payment_type=payment_type, amount=amount, slip=slip, paid_at=paid_at,
                payment_number=payment_number,
            )
    except IntegrityError:
        # Two concurrent submissions of the same payment_type for the same booking
        # (Critical Rule #8 — the DB partial unique index is the authoritative guard).
        raise AppError(
            'DUPLICATE_PENDING_PAYMENT', 'A payment of this type is already pending review for this booking.',
            http_status=409,
        )


@transaction.atomic
def approve_payment(*, payment_id, admin, remark: str = '') -> Payment:
    try:
        payment = Payment.objects.select_for_update().get(pk=payment_id)
    except Payment.DoesNotExist:
        raise AppError('NOT_FOUND', 'Payment not found.', http_status=404)

    if payment.status != Payment.Status.PENDING:
        raise AppError('INVALID_STATE_TRANSITION', f'Payment is already {payment.status}.', http_status=422)

    booking = Booking.objects.select_for_update().get(pk=payment.booking_id)
    if booking.status in _BOOKING_NOT_PAYABLE_STATUSES:
        raise AppError(
            'BOOKING_NOT_PAYABLE', f'Booking is {booking.status}; this payment can no longer be approved.',
            http_status=422,
        )

    new_paid = booking.paid_amount + payment.amount
    if new_paid > booking.price:
        raise AppError('OVERPAYMENT', 'Approving this payment would exceed the booking price.', http_status=422)

    payment.status = Payment.Status.APPROVED
    payment.verified_by = admin
    payment.verified_at = timezone.now()
    payment.remark = remark
    payment.save(update_fields=['status', 'verified_by', 'verified_at', 'remark', 'updated_at'])

    booking.paid_amount = new_paid
    booking.remaining_amount = booking.price - new_paid
    if booking.status == Booking.Status.WAITING_PAYMENT and booking.paid_amount >= booking.deposit_amount:
        booking.status = Booking.Status.PAID
    booking.save(update_fields=['paid_amount', 'remaining_amount', 'status', 'updated_at'])

    return payment


@transaction.atomic
def reject_payment(*, payment_id, admin, remark: str = '') -> Payment:
    try:
        payment = Payment.objects.select_for_update().get(pk=payment_id)
    except Payment.DoesNotExist:
        raise AppError('NOT_FOUND', 'Payment not found.', http_status=404)

    if payment.status != Payment.Status.PENDING:
        raise AppError('INVALID_STATE_TRANSITION', f'Payment is already {payment.status}.', http_status=422)

    payment.status = Payment.Status.REJECTED
    payment.verified_by = admin
    payment.verified_at = timezone.now()
    payment.remark = remark
    payment.save(update_fields=['status', 'verified_by', 'verified_at', 'remark', 'updated_at'])
    return payment
