"""
Business logic for the notification inbox and LINE account linking (STEP17).
Kept out of views.py per Global Rule #16.
"""

import base64
import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.core.exceptions import AppError

from apps.notifications.models import LineLinkCode

LINK_CODE_TTL_MINUTES = 10
_LINK_CODE_MAX_ATTEMPTS = 5


def generate_link_code(user: User) -> LineLinkCode:
    """
    Issues a fresh 6-digit code for `user`, superseding any of their own unused codes
    (only one active code per user at a time — a customer requesting again just gets a
    new code instead of juggling multiple). Retries on the rare random-value collision
    against another user's still-active code (see LineLinkCode.Meta.constraints).
    """
    LineLinkCode.objects.filter(user=user, used_at__isnull=True).delete()
    expires_at = timezone.now() + timedelta(minutes=LINK_CODE_TTL_MINUTES)

    for _ in range(_LINK_CODE_MAX_ATTEMPTS):
        code = f'{secrets.randbelow(1_000_000):06d}'
        try:
            with transaction.atomic():
                return LineLinkCode.objects.create(user=user, code=code, expires_at=expires_at)
        except IntegrityError:
            continue

    raise AppError(
        'LINK_CODE_GENERATION_FAILED', 'Could not generate a unique link code, please try again.', http_status=500,
    )


def verify_line_signature(body: bytes, signature: str) -> bool:
    """
    LINE signs every webhook request with HMAC-SHA256(channel secret, raw body),
    base64-encoded, in the X-Line-Signature header. An unconfigured channel secret
    (dev/test default) always fails closed rather than accepting unverifiable requests.
    """
    channel_secret = settings.LINE_CHANNEL_SECRET
    if not channel_secret or not signature:
        return False
    computed = base64.b64encode(
        hmac.new(channel_secret.encode('utf-8'), body, hashlib.sha256).digest()
    ).decode('utf-8')
    return hmac.compare_digest(computed, signature)


def process_line_webhook_event(event: dict) -> None:
    """
    Looks for a 6-digit code in an incoming LINE text message and, if it matches an
    active LineLinkCode, attaches the message sender's LINE userId to that code's User.
    Silently ignores anything that isn't a matching, unexpired, unused code — LINE
    expects a 200 response regardless of whether the message meant anything to us, and
    there's no reply-back channel configured (LINE_CHANNEL_ACCESS_TOKEN) to explain why.
    """
    if event.get('type') != 'message' or event.get('message', {}).get('type') != 'text':
        return

    text = event['message'].get('text') or ''
    digits = ''.join(ch for ch in text if ch.isdigit())
    if len(digits) != 6:
        return

    line_user_id = event.get('source', {}).get('userId')
    if not line_user_id:
        return

    try:
        with transaction.atomic():
            link_code = (
                LineLinkCode.objects.select_for_update()
                .select_related('user')
                .filter(code=digits, used_at__isnull=True, expires_at__gt=timezone.now())
                .first()
            )
            if not link_code:
                return

            link_code.user.line_user_id = line_user_id
            link_code.user.save(update_fields=['line_user_id'])
            link_code.used_at = timezone.now()
            link_code.save(update_fields=['used_at'])
    except IntegrityError:
        # line_user_id is already linked to a different account (unique constraint on
        # User.line_user_id) — leave this code unused rather than silently stealing
        # the link; it will simply expire.
        pass
