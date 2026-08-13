import logging

from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core import exceptions as django_exceptions
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.accounts.models import User
from apps.core.exceptions import AppError

logger = logging.getLogger('apps.accounts')


def blacklist_all_outstanding_tokens_for_user(user: User) -> None:
    """
    Revoke every refresh token this user currently holds (Global Rule for
    session invalidation on password change — used by change-password and
    password-reset-confirm so old sessions can't keep using the old password).
    """
    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)


def request_password_reset(email: str) -> None:
    """
    Always succeeds from the caller's point of view (the view returns a generic
    200 regardless) so this endpoint can't be used to enumerate registered
    emails. Only actually sends a mail when a matching, active account exists.
    """
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user is None:
        logger.info('Password reset requested for unknown/inactive email=%s', email)
        return

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    send_mail(
        subject='รีเซ็ตรหัสผ่าน - ระบบจัดการการฝากผสมไก่ชน',
        message=(
            f'ใช้ uid={uid} และ token={token} กับ POST /api/v1/auth/password-reset/confirm/ '
            f'เพื่อตั้งรหัสผ่านใหม่ (ลิงก์นี้หมดอายุใน {settings.PASSWORD_RESET_TIMEOUT // 60} นาที)'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=True,
    )


def confirm_password_reset(*, uid: str, token: str, new_password: str) -> User:
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        raise AppError('INVALID_RESET_TOKEN', 'This reset link is invalid.', http_status=400)

    if not default_token_generator.check_token(user, token):
        raise AppError('INVALID_RESET_TOKEN', 'This reset link is invalid or has expired.', http_status=400)

    try:
        password_validation.validate_password(new_password, user=user)
    except django_exceptions.ValidationError as exc:
        raise AppError('WEAK_PASSWORD', ' '.join(exc.messages), http_status=400)

    user.set_password(new_password)
    user.save(update_fields=['password'])
    blacklist_all_outstanding_tokens_for_user(user)
    return user
