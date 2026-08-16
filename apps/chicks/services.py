from django.db import transaction
from django.utils import timezone

from apps.chicks.models import Chick
from apps.core.exceptions import AppError
from apps.core.models import RunningNumberCounter
from apps.core.services import format_wing_clip_number, next_running_number
from apps.hatching.models import Hatching


@transaction.atomic
def create_chick(
    *, hatching_id, birth_date, name: str = '', gender=Chick.Gender.UNKNOWN, color_note=None,
) -> Chick:
    """
    Create a Chick with a guaranteed-unique wing_clip_number (STEP1 Business Rule #13/#14).

    STEP7 rules: the parent Hatching must exist and have status HATCHED (STEP1
    §9.4/§9.5 state machines), and the number of Chick rows for that Hatching must
    never exceed its hatched_count. select_for_update() on the Hatching row serializes
    concurrent create_chick() calls for the same batch so the count check can't race.
    """
    try:
        hatching = Hatching.objects.select_for_update().select_related('egg__booking').get(pk=hatching_id)
    except Hatching.DoesNotExist:
        raise AppError('NOT_FOUND', 'Hatching batch not found.', http_status=404)

    if hatching.status != Hatching.Status.HATCHED:
        raise AppError(
            'CHICK_CREATION_REQUIRES_HATCHED_BATCH',
            'Chick can only be created once the Hatching batch status is HATCHED.', http_status=422,
        )

    existing_count = hatching.chicks.count()
    if existing_count >= hatching.hatched_count:
        raise AppError(
            'CHICK_COUNT_EXCEEDS_HATCHED',
            f'This Hatching batch already has {existing_count} of {hatching.hatched_count} hatched chicks recorded.',
            http_status=422,
        )

    if birth_date > timezone.localdate():
        raise AppError('BIRTH_DATE_IN_FUTURE', 'birth_date must not be in the future.', http_status=422)
    if birth_date < hatching.started_at:
        raise AppError(
            'BIRTH_DATE_BEFORE_HATCHING_STARTED', 'birth_date cannot be earlier than the hatching started_at.',
            http_status=422,
        )

    with transaction.atomic():
        sequence = next_running_number(RunningNumberCounter.CounterType.WING_CLIP, birth_date.year)
        wing_clip_number = format_wing_clip_number(birth_date.year, sequence)
        return Chick.objects.create(
            hatching=hatching,
            booking=hatching.egg.booking,
            wing_clip_number=wing_clip_number,
            name=name or '',
            birth_date=birth_date,
            gender=gender,
            color_note=color_note,
        )
