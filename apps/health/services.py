"""Business logic for HealthRecord (STEP7). Kept out of views.py per Global Rule #16."""

from django.utils import timezone

from apps.chicks.models import Chick
from apps.core.exceptions import AppError

from apps.health.models import HealthRecord


def record_health(
    *, chick_id, record_date, weight=None, symptom: str = '', observation: str = '', medicine: str = '',
    remark: str = '', recorded_by,
) -> HealthRecord:
    try:
        chick = Chick.objects.select_related('hatching__egg__booking').get(pk=chick_id)
    except Chick.DoesNotExist:
        raise AppError('NOT_FOUND', 'Chick not found.', http_status=404)

    if weight is not None and weight < 0:
        raise AppError('INVALID_WEIGHT', 'weight must not be negative.', http_status=422)

    if record_date > timezone.localdate():
        raise AppError('RECORD_DATE_IN_FUTURE', 'record_date must not be in the future.', http_status=422)
    if record_date < chick.birth_date:
        raise AppError(
            'RECORD_DATE_BEFORE_BIRTH', 'record_date cannot be earlier than the chick birth_date.', http_status=422,
        )

    return HealthRecord.objects.create(
        chick=chick, record_date=record_date, weight=weight, symptom=symptom or '', observation=observation or '',
        medicine=medicine or '', remark=remark or '', recorded_by=recorded_by,
    )
