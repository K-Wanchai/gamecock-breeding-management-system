"""Business logic for Vaccination (STEP7). Kept out of views.py per Global Rule #16."""

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.chicks.models import Chick
from apps.core.exceptions import AppError

from apps.vaccinations.models import Vaccination


@transaction.atomic
def record_vaccination(
    *, chick_id, vaccine_name: str, vaccination_date, dose_number: int, remark: str = '', recorded_by,
) -> Vaccination:
    try:
        chick = Chick.objects.select_related('hatching__egg__booking').get(pk=chick_id)
    except Chick.DoesNotExist:
        raise AppError('NOT_FOUND', 'Chick not found.', http_status=404)

    if dose_number < 1:
        raise AppError('INVALID_DOSE_NUMBER', 'dose_number must be at least 1.', http_status=422)

    if vaccination_date > timezone.localdate():
        raise AppError('VACCINATION_DATE_IN_FUTURE', 'vaccination_date must not be in the future.', http_status=422)
    if vaccination_date < chick.birth_date:
        raise AppError(
            'VACCINATION_DATE_BEFORE_BIRTH', 'vaccination_date cannot be earlier than the chick birth_date.',
            http_status=422,
        )

    age_days = (vaccination_date - chick.birth_date).days

    try:
        with transaction.atomic():
            return Vaccination.objects.create(
                chick=chick, vaccine_name=vaccine_name, vaccination_date=vaccination_date, age_days=age_days,
                dose_number=dose_number, remark=remark or '', recorded_by=recorded_by,
            )
    except IntegrityError:
        raise AppError(
            'DUPLICATE_VACCINATION', 'This vaccine dose has already been recorded for this chick.', http_status=409,
        )
