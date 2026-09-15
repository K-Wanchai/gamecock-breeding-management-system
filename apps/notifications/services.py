"""
Business logic for email notifications. notify_*() functions send an email to the
user and record a Notification row in the DB as an audit log.
Sending is best-effort — failures are recorded as FAILED but never raise into the caller.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.core.exceptions import AppError
from apps.notifications.models import Notification

logger = logging.getLogger('apps.notifications')

MAX_RETRY_ATTEMPTS = 3

_SUBJECT: dict[str, str] = {
    'BOOKING_APPROVED': '[ระบบไก่ชน] การจองคิวได้รับการอนุมัติ',
    'BOOKING_CANCELLED': '[ระบบไก่ชน] การจองคิวถูกยกเลิก',
    'PAYMENT_APPROVED': '[ระบบไก่ชน] ยืนยันการชำระเงินแล้ว — กรุณาดูข้อมูลการจัดส่ง',
    'PAYMENT_APPROVED_FOLLOWUP': '[ระบบไก่ชน] การชำระเงินได้รับการยืนยัน',
    'PAYMENT_REJECTED': '[ระบบไก่ชน] การชำระเงินถูกปฏิเสธ',
    'HEN_RECEIVED': '[ระบบไก่ชน] แม่ไก่ถึงฟาร์มแล้ว',
    'BREEDING_UPDATED': '[ระบบไก่ชน] อัพเดตกระบวนการผสมพันธุ์',
    'HATCHING_COMPLETED': '[ระบบไก่ชน] ผลการฟักไข่',
}

_BREEDING_STATUS_LABEL: dict[str, str] = {
    'RECEIVED': 'รับแม่ไก่เข้าฟาร์มแล้ว',
    'BREEDING': 'เริ่มกระบวนการผสมพันธุ์แล้ว',
    'BREEDING_COMPLETED': 'การผสมพันธุ์เสร็จสิ้น อยู่ในช่วงรอออกไข่',
    'WAITING_EGG': 'อยู่ในช่วงรอการออกไข่',
    'EGG_LAID': 'แม่ไก่ออกไข่แล้ว',
    'INCUBATION': 'เริ่มการฟักไข่แล้ว',
    'HATCHING': 'ไข่ออกมาเป็นตัวแล้ว',
}


def _send_email(notification: Notification) -> None:
    """Attempts email delivery and updates notification status in place. Never raises."""
    user = notification.user
    if not user.email:
        notification.status = Notification.Status.FAILED
        notification.error_note = 'User has no email address.'
        notification.save(update_fields=['status', 'error_note', 'updated_at'])
        return

    subject = _SUBJECT.get(notification.notif_type, '[ระบบไก่ชน] แจ้งเตือน')
    try:
        send_mail(
            subject=subject,
            message=notification.message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:
        notification.status = Notification.Status.FAILED
        notification.error_note = str(exc)[:255]
        notification.save(update_fields=['status', 'error_note', 'updated_at'])
        logger.warning('Email send failed for notification %s: %s', notification.id, exc)
        return

    notification.status = Notification.Status.SENT
    notification.sent_at = timezone.now()
    notification.error_note = None
    notification.save(update_fields=['status', 'sent_at', 'error_note', 'updated_at'])


def create_and_send_notification(*, user, notif_type: str, message: str, booking=None, chick=None) -> Notification:
    notification = Notification.objects.create(
        user=user, notif_type=notif_type, message=message, booking=booking, chick=chick,
        channel='EMAIL', status=Notification.Status.PENDING,
    )
    _send_email(notification)
    return notification


@transaction.atomic
def retry_notification(*, notification_id, admin=None) -> Notification:
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
    _send_email(notification)
    return notification


def _notify(*, user, notif_type: str, message: str, booking=None, chick=None) -> None:
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
    booking = payment.booking
    # First payment approval → include farm address and shipping instructions
    if booking.status == 'PAID':
        from apps.core.models import FarmSetting  # local import: avoids circular at module load
        farm = FarmSetting.load()
        farm_name = farm.farm_name
        farm_address = farm.farm_address
        message = (
            f'การชำระเงิน {payment.payment_number} จำนวน {payment.amount} บาท ได้รับการยืนยันแล้ว\n\n'
            f'รายละเอียดการจอง:\n'
            f'  รหัสการจอง: {booking.booking_number}\n'
            f'  แม่ไก่: {booking.hen.name}\n'
            f'  พ่อพันธุ์: {booking.breeder.name}\n\n'
            f'*** กรุณาจดรหัสการจอง ({booking.booking_number}) และเขียนบนกล่องส่งแม่ไก่ ***\n\n'
            f'ที่อยู่ฟาร์ม:\n{farm_address}\n\n'
            f'ขอบคุณที่ใช้บริการ {farm_name}'
        )
        _notify(user=booking.customer, notif_type='PAYMENT_APPROVED', booking=booking, message=message)
    else:
        _notify(
            user=booking.customer, notif_type='PAYMENT_APPROVED_FOLLOWUP', booking=booking,
            message=f'การชำระเงิน {payment.payment_number} จำนวน {payment.amount} บาท ได้รับการยืนยันแล้ว',
        )


def notify_payment_rejected(payment) -> None:
    remark = f'\nเหตุผล: {payment.remark}' if payment.remark else ''
    _notify(
        user=payment.booking.customer, notif_type='PAYMENT_REJECTED', booking=payment.booking,
        message=f'การชำระเงิน {payment.payment_number} ถูกปฏิเสธ{remark}\n\nกรุณาเข้าสู่ระบบเพื่อแนบสลิปใหม่',
    )


def notify_breeding_event(event) -> None:
    booking = event.booking
    status_label = _BREEDING_STATUS_LABEL.get(event.status, event.status)
    description = f'\nรายละเอียด: {event.description}' if event.description else ''
    _notify(
        user=booking.customer, notif_type='BREEDING_UPDATED', booking=booking,
        message=f'อัพเดตสถานะการผสมพันธุ์ (รหัสจอง {booking.booking_number}):\n{status_label}{description}',
    )


def notify_hatching_completed(hatching) -> None:
    booking = hatching.egg.booking
    rate = f'{hatching.hatching_rate}%' if hasattr(hatching, 'hatching_rate') else ''
    message = (
        f'ผลการฟักไข่ (รหัสจอง {booking.booking_number}):\n'
        f'  ไข่ทั้งหมด: {hatching.total_eggs} ฟอง\n'
        f'  ฟักออกมา: {hatching.hatched_count} ตัว\n'
        f'  ไม่ฟัก: {hatching.failed_count} ตัว\n'
        f'  รอด: {hatching.survival_count} ตัว'
    )
    _notify(user=booking.customer, notif_type='HATCHING_COMPLETED', booking=booking, message=message)
