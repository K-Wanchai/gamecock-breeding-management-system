"""
STEP9 — batch retry for FAILED LINE notifications. There is no task queue
(Celery/etc.) in this project, so retrying happens either one at a time via
the ADMIN-only `POST /api/v1/notifications/{id}/retry/` API action, or in
batch here via a cron/manual run of this command.
"""

from django.core.management.base import BaseCommand

from apps.core.exceptions import AppError
from apps.notifications import services
from apps.notifications.models import Notification


class Command(BaseCommand):
    help = 'Retries every FAILED notification that has not yet hit the retry limit.'

    def handle(self, *args, **options):
        candidates = Notification.objects.filter(
            status=Notification.Status.FAILED, retry_count__lt=services.MAX_RETRY_ATTEMPTS,
        )

        retried, sent, still_failed = 0, 0, 0
        for notification_id in candidates.values_list('id', flat=True):
            retried += 1
            try:
                notification = services.retry_notification(notification_id=notification_id)
            except AppError as exc:
                # A row-level failure (e.g. hit the limit between the query above and
                # this call) must never stop the rest of the batch from being retried.
                self.stderr.write(f'notification {notification_id}: {exc.code} — {exc.message}')
                continue

            if notification.status == Notification.Status.SENT:
                sent += 1
            else:
                still_failed += 1

        self.stdout.write(self.style.SUCCESS(f'Retried {retried} notification(s): {sent} sent, {still_failed} still failed.'))
