from django.db import transaction

from apps.chicks.models import Chick
from apps.core.models import RunningNumberCounter
from apps.core.services import format_wing_clip_number, next_running_number
from apps.hatching.models import Hatching


def create_chick(*, hatching: Hatching, hatch_date, gender=Chick.Gender.UNKNOWN, color_note=None) -> Chick:
    """
    Create a Chick with a guaranteed-unique wing_clip_number (STEP1 Business Rule #13/#14).

    Only allowed once the batch has actually hatched (Hatching.status == HATCHED) — see
    STEP1 §9.4/§9.5 state machines. The number is generated and the row inserted inside
    the same transaction so a concurrent request can never observe or reuse the same number.
    """
    if hatching.status != Hatching.Status.HATCHED:
        from apps.core.exceptions import AppError
        raise AppError(
            code='CHICK_CREATION_REQUIRES_HATCHED_BATCH',
            message='Chick can only be created once the Hatching batch status is HATCHED.',
        )

    with transaction.atomic():
        sequence = next_running_number(RunningNumberCounter.CounterType.WING_CLIP, hatch_date.year)
        wing_clip_number = format_wing_clip_number(hatch_date.year, sequence)
        return Chick.objects.create(
            hatching=hatching,
            wing_clip_number=wing_clip_number,
            hatch_date=hatch_date,
            gender=gender,
            color_note=color_note,
        )
