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

_THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]


def _fmt_date(d) -> str:
    """Format a date/datetime object as Thai Buddhist Era string, e.g. '16 กันยายน 2569'."""
    if d is None:
        return '-'
    if hasattr(d, 'date'):
        d = d.date()
    return f'{d.day} {_THAI_MONTHS[d.month - 1]} {d.year + 543}'

_SUBJECT: dict[str, str] = {
    'BOOKING_APPROVED': '[ระบบไก่ชน] การจองคิวได้รับการอนุมัติ',
    'BOOKING_CANCELLED': '[ระบบไก่ชน] การจองคิวถูกยกเลิก',
    'PAYMENT_APPROVED': '[ระบบไก่ชน] ยืนยันการชำระเงินแล้ว — กรุณาดูข้อมูลการจัดส่ง',
    'PAYMENT_APPROVED_FOLLOWUP': '[ระบบไก่ชน] การชำระเงินได้รับการยืนยัน',
    'PAYMENT_REJECTED': '[ระบบไก่ชน] การชำระเงินถูกปฏิเสธ',
    'HEN_RECEIVED': '[ระบบไก่ชน] แม่ไก่ถึงฟาร์มแล้ว',
    'BREEDING_UPDATED': '[ระบบไก่ชน] อัพเดตกระบวนการผสมพันธุ์',
    'HATCHING_COMPLETED': '[ระบบไก่ชน] ผลการฟักไข่',
    'INSEMINATION_RECORDED': '[ระบบไก่ชน] บันทึกการฉีดน้ำเชื้อ',
    'EGG_RECORDED': '[ระบบไก่ชน] บันทึกข้อมูลไข่',
    'HATCHING_STARTED': '[ระบบไก่ชน] เริ่มการฟักไข่',
    'HEN_BROODING': '[ระบบไก่ชน] แม่ไก่เริ่มกกไข่',
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


def _notify_inapp(*, user, notif_type: str, message: str, booking=None, chick=None) -> None:
    """Create an in-app notification row only — no email, no LINE. Status is SENT immediately."""
    try:
        Notification.objects.create(
            user=user, notif_type=notif_type, message=message, booking=booking, chick=chick,
            channel='IN_APP', status=Notification.Status.SENT, sent_at=timezone.now(),
        )
    except Exception:
        logger.exception('Unexpected error while creating in-app notification (notif_type=%s, user_id=%s)', notif_type, user.id)


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


def notify_insemination_recorded(record) -> None:
    booking = record.booking
    note_line = f'\n  บันทึก: {record.note}' if record.note else ''
    _notify(
        user=booking.customer, notif_type='INSEMINATION_RECORDED', booking=booking,
        message=(
            f'บันทึกการฉีดน้ำเชื้อครั้งที่ {record.session_number} (รหัสจอง {booking.booking_number})\n'
            f'  วันที่: {_fmt_date(record.record_date)}{note_line}'
        ),
    )


def notify_egg_recorded(egg) -> None:
    booking = egg.booking
    incubation_line = f'\n  วันที่เข้าตู้ฟัก: {_fmt_date(egg.incubation_date)}' if egg.incubation_date else ''
    _notify(
        user=booking.customer, notif_type='EGG_RECORDED', booking=booking,
        message=(
            f'บันทึกข้อมูลไข่ (รหัสจอง {booking.booking_number}):\n'
            f'  ไข่ทั้งหมด: {egg.total_eggs} ฟอง '
            f'(ดี {egg.good_eggs} / เสีย {egg.bad_eggs})\n'
            f'  วันที่ออกไข่: {_fmt_date(egg.egg_date)}{incubation_line}'
        ),
    )


def notify_hatching_started(hatching) -> None:
    booking = hatching.egg.booking
    _notify(
        user=booking.customer, notif_type='HATCHING_STARTED', booking=booking,
        message=(
            f'เริ่มการฟักไข่ (รหัสจอง {booking.booking_number}):\n'
            f'  ไข่ที่นำเข้าฟัก: {hatching.total_eggs} ฟอง\n'
            f'  วันที่เริ่มฟัก: {_fmt_date(hatching.started_at)}'
        ),
    )


def notify_hen_brooding(booking) -> None:
    brooding_date = _fmt_date(booking.brooding_started_at)
    _notify(
        user=booking.customer, notif_type='HEN_BROODING', booking=booking,
        message=(
            f'แม่ไก่ของท่านเริ่มกกไข่แล้ว (รหัสจอง {booking.booking_number})\n'
            f'  แม่ไก่: {booking.hen.name}\n'
            f'  วันที่เริ่มกก: {brooding_date}'
        ),
    )


def notify_clip_ready(booking) -> None:
    from apps.core.models import FarmSetting  # local import: avoids circular at module load
    farm = FarmSetting.load()
    farm_name = farm.farm_name or 'ฟาร์มไก่ชน'
    _notify_inapp(
        user=booking.customer,
        notif_type='CLIP_READY',
        booking=booking,
        message=(
            f'รหัสการจอง {booking.booking_number}\n\n'
            f'ขณะนี้ {farm_name} กำลังดำเนินการจัดทำเบอร์กิ๊ปและออกใบรับรองสายพันธุ์ให้กับลูกไก่ของท่าน\n\n'
            f'ท่านจะได้รับลูกไก่พร้อมใบรับรองในเร็วๆ นี้'
        ),
    )
