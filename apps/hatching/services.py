"""
Business logic for the two-phase hatching lifecycle (STEP7): start_hatching()
opens a batch against an Egg; complete_hatching() records its final counts.
Kept out of views.py per Global Rule #16. State-changing operations run inside
transaction.atomic() and take select_for_update() on the contended row(s)
(Global Rules #18/#19).
"""

from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.utils import timezone

from apps.breeding.models import Egg
from apps.core.exceptions import AppError

from apps.hatching.models import Hatching


@transaction.atomic
def start_hatching(*, egg_id, started_at, remark: str = '', recorded_by) -> Hatching:
    try:
        egg = Egg.objects.select_for_update().get(pk=egg_id)
    except Egg.DoesNotExist:
        raise AppError('NOT_FOUND', 'Egg batch not found.', http_status=404)

    if started_at > timezone.localdate():
        raise AppError('STARTED_AT_IN_FUTURE', 'started_at must not be in the future.', http_status=422)

    hatching = Hatching.objects.create(
        egg=egg, started_at=started_at, total_eggs=egg.total_eggs, remark=remark or '', recorded_by=recorded_by,
    )
    from apps.notifications import services as notification_services
    transaction.on_commit(lambda: notification_services.notify_hatching_started(hatching))
    return hatching


@transaction.atomic
def complete_hatching(
    *, hatching_id, completed_at, hatched_count: int, failed_count: int = 0, survival_count: int = 0,
    remark: str = '', actor,
) -> Hatching:
    try:
        hatching = Hatching.objects.select_for_update().get(pk=hatching_id)
    except Hatching.DoesNotExist:
        raise AppError('NOT_FOUND', 'Hatching batch not found.', http_status=404)

    if hatching.status != Hatching.Status.INCUBATING:
        raise AppError(
            'INVALID_STATE_TRANSITION', f'Hatching batch is already {hatching.status}.', http_status=422,
        )

    if hatched_count < 0 or failed_count < 0 or survival_count < 0:
        raise AppError('INVALID_HATCHING_COUNT', 'Counts must not be negative.', http_status=422)
    if hatched_count + failed_count > hatching.total_eggs:
        raise AppError(
            'INVALID_HATCHING_COUNT', 'hatched_count + failed_count must not exceed total_eggs.', http_status=422,
        )
    if survival_count > hatched_count:
        raise AppError('INVALID_HATCHING_COUNT', 'survival_count must not exceed hatched_count.', http_status=422)

    if completed_at > timezone.localdate():
        raise AppError('COMPLETED_AT_IN_FUTURE', 'completed_at must not be in the future.', http_status=422)
    if completed_at < hatching.started_at:
        raise AppError(
            'COMPLETED_AT_BEFORE_STARTED_AT', 'completed_at must not be before started_at.', http_status=422,
        )

    hatching.completed_at = completed_at
    hatching.hatched_count = hatched_count
    hatching.failed_count = failed_count
    hatching.survival_count = survival_count
    hatching.status = Hatching.Status.HATCHED if hatched_count > 0 else Hatching.Status.FAILED
    if remark:
        hatching.remark = remark
    hatching.save(update_fields=[
        'completed_at', 'hatched_count', 'failed_count', 'survival_count', 'status', 'remark', 'updated_at',
    ])

    from apps.notifications import services as notification_services
    transaction.on_commit(lambda: notification_services.notify_hatching_completed(hatching))
    return hatching


def calculate_hatching_rate(hatching: Hatching) -> Decimal:
    """hatched_count / total_eggs * 100 (2 dp). 0.00 when total_eggs is 0."""
    if hatching.total_eggs == 0:
        return Decimal('0.00')
    rate = Decimal(hatching.hatched_count) / Decimal(hatching.total_eggs) * Decimal('100')
    return rate.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
