"""
Business logic for LINE notifications (STEP9): sending, retrying, account
linking, and webhook signature verification/event handling. Kept out of
views.py per Global Rule #16.

Sending is best-effort and must never raise into a caller — notify_*() below
is invoked from apps.bookings/apps.payments services.py via
transaction.on_commit(), i.e. *after* the triggering business transaction has
already committed. An unhandled exception there would surface as a 500 to the
client even though the booking/payment operation itself already succeeded, so
every notify_*() wrapper swallows and logs instead of raising.
"""

import hashlib
import hmac
import base64
import logging
import random

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.core.exceptions import AppError

from apps.notifications.models import Notification

logger = logging.getLogger('apps.notifications')

LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push'
LINE_REQUEST_TIMEOUT_SECONDS = 5
MAX_RETRY_ATTEMPTS = 3
LINK_CODE_LENGTH = 6
LINK_CODE_TTL_MINUTES = 10


def _send_line_push(notification: Notification) -> None:
    """
    Attempts delivery for `notification` and updates its status in place.
    Never raises — any failure (missing config, missing recipient, network
    error, non-2xx response) is recorded as FAILED with an error_note instead.
    """
    user = notification.user

    if not user.line_user_id:
        notification.status = Notification.Status.FAILED
        notification.error_note = 'User has no linked LINE account (line_user_id is not set).'
        notification.save(update_fields=['status', 'error_note', 'updated_at'])
        return

    token = settings.LINE_CHANNEL_ACCESS_TOKEN
    if not token:
        notification.status = Notification.Status.FAILED
        notification.error_note = 'LINE_CHANNEL_ACCESS_TOKEN is not configured.'
        notification.save(update_fields=['status', 'error_note', 'updated_at'])
        return

    try:
        response = requests.post(
            LINE_PUSH_URL,
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            json={'to': user.line_user_id, 'messages': [{'type': 'text', 'text': notification.message}]},
            timeout=LINE_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        notification.status = Notification.Status.FAILED
        notification.error_note = str(exc)[:255]
        notification.save(update_fields=['status', 'error_note', 'updated_at'])
        logger.warning('LINE push failed for notification %s: %s', notification.id, exc)
        return

    notification.status = Notification.Status.SENT
    notification.sent_at = timezone.now()
    notification.error_note = None
    notification.save(update_fields=['status', 'sent_at', 'error_note', 'updated_at'])


def create_and_send_notification(*, user, notif_type: str, message: str, booking=None, chick=None) -> Notification:
    notification = Notification.objects.create(
        user=user, notif_type=notif_type, message=message, booking=booking, chick=chick,
        channel='LINE', status=Notification.Status.PENDING,
    )
    _send_line_push(notification)
    return notification


@transaction.atomic
def retry_notification(*, notification_id, admin=None) -> Notification:
    """`admin` is the acting user for the audit log — None when called from the
    retry_failed_notifications management command (system/cron-triggered, no
    request context) rather than the ADMIN-only API action."""
    try:
        notification = Notification.objects.select_for_update().get(pk=notification_id)
    except Notification.DoesNotExist:
        raise AppError('NOT_FOUND', 'Notification not found.', http_status=404)

    if notification.status == Notification.Status.SENT:
        raise AppError('NOTIFICATION_ALREADY_SENT', 'This notification has already been sent.', http_status=409)
    if notification.retry_count >= MAX_RETRY_ATTEMPTS:
        raise AppError(
            'RETRY_LIMIT_EXCEEDED', f'This notification has already been retried {MAX_RETRY_ATTEMPTS} times.',
            http_status=409,
        )

    notification.retry_count += 1
    notification.save(update_fields=['retry_count', 'updated_at'])
    logger.info(
        'Retrying notification %s (attempt %s/%s), triggered by %s',
        notification.id, notification.retry_count, MAX_RETRY_ATTEMPTS,
        admin.username if admin else 'system',
    )
    _send_line_push(notification)
    return notification


def _notify(*, user, notif_type: str, message: str, booking=None, chick=None) -> None:
    """Best-effort wrapper for notify_*() below — never raises (see module docstring)."""
    try:
        create_and_send_notification(user=user, notif_type=notif_type, message=message, booking=booking, chick=chick)
    except Exception:
        logger.exception('Unexpected error while sending notification (notif_type=%s, user_id=%s)', notif_type, user.id)


def notify_booking_approved(booking) -> None:
    _notify(
        user=booking.customer, notif_type='BOOKING_APPROVED', booking=booking,
        message=f'การจองคิว {booking.booking_number} ได้รับการอนุมัติแล้ว (คิวที่ {booking.queue_no}).',
    )


def notify_booking_cancelled(booking) -> None:
    reason = f' เหตุผล: {booking.cancel_reason}' if booking.cancel_reason else ''
    _notify(
        user=booking.customer, notif_type='BOOKING_CANCELLED', booking=booking,
        message=f'การจองคิว {booking.booking_number} ถูกยกเลิก.{reason}',
    )


def notify_payment_approved(payment) -> None:
    _notify(
        user=payment.booking.customer, notif_type='PAYMENT_APPROVED', booking=payment.booking,
        message=f'การชำระเงิน {payment.payment_number} จำนวน {payment.amount} บาท ได้รับการยืนยันแล้ว.',
    )


def notify_payment_rejected(payment) -> None:
    remark = f' เหตุผล: {payment.remark}' if payment.remark else ''
    _notify(
        user=payment.booking.customer, notif_type='PAYMENT_REJECTED', booking=payment.booking,
        message=f'การชำระเงิน {payment.payment_number} ถูกปฏิเสธ.{remark}',
    )


def generate_line_link_code(user) -> tuple[str, 'timezone.datetime']:
    """
    Issues a short-lived numeric code the user sends as a LINE message to
    the farm's LINE OA to prove ownership of that LINE account (STEP9
    self-service linking flow; see process_line_webhook_event()).
    """
    now = timezone.now()
    for _ in range(5):
        code = f'{random.randint(0, 10 ** LINK_CODE_LENGTH - 1):0{LINK_CODE_LENGTH}d}'
        collision = User.objects.filter(line_link_code=code, line_link_code_expires_at__gt=now).exclude(pk=user.pk).exists()
        if not collision:
            break

    expires_at = now + timezone.timedelta(minutes=LINK_CODE_TTL_MINUTES)
    user.line_link_code = code
    user.line_link_code_expires_at = expires_at
    user.save(update_fields=['line_link_code', 'line_link_code_expires_at', 'updated_at'])
    return code, expires_at


def verify_line_signature(body: bytes, signature: str) -> bool:
    """HMAC-SHA256(channel secret, raw body), base64-encoded, constant-time compared
    against the X-Line-Signature header (LINE Messaging API webhook security rule)."""
    secret = settings.LINE_CHANNEL_SECRET
    if not secret or not signature:
        return False
    digest = hmac.new(secret.encode('utf-8'), body, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode('utf-8')
    return hmac.compare_digest(expected, signature)


def process_line_webhook_event(event: dict) -> None:
    """
    Handles one verified LINE webhook event. Only text messages are meaningful
    here (account-linking codes) — anything else (follow/unfollow/other
    message types) is silently ignored. Always succeeds without raising: the
    webhook view acks 200 to LINE regardless of whether a link was made.
    """
    if event.get('type') != 'message' or event.get('message', {}).get('type') != 'text':
        return

    text = (event['message'].get('text') or '').strip()
    line_user_id = event.get('source', {}).get('userId')
    if not text or not line_user_id:
        return

    now = timezone.now()
    with transaction.atomic():
        try:
            user = User.objects.select_for_update().get(
                line_link_code=text, line_link_code_expires_at__gt=now, line_user_id__isnull=True,
            )
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            return

        user.line_user_id = line_user_id
        user.line_link_code = None
        user.line_link_code_expires_at = None
        user.save(update_fields=['line_user_id', 'line_link_code', 'line_link_code_expires_at', 'updated_at'])
