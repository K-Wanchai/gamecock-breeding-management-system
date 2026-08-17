from django.db import transaction
from django.db.models import ProtectedError

from apps.breeders.models import Breeder, BreederMonthlyQuota
from apps.core.exceptions import AppError


def create_breeder(*, validated_data: dict, created_by) -> Breeder:
    return Breeder.objects.create(**validated_data, created_by=created_by)


@transaction.atomic
def update_breeder(*, instance: Breeder, validated_data: dict) -> Breeder:
    """
    Plain field update, plus: if the image is being replaced or cleared, the old
    file is removed from storage so replacing a breeder's photo doesn't leak an
    orphaned file on every edit.
    """
    old_image = instance.image
    new_image_provided = 'image' in validated_data
    new_image = validated_data.get('image')

    for field, value in validated_data.items():
        setattr(instance, field, value)
    instance.save()

    if new_image_provided and old_image and old_image != new_image:
        old_image.delete(save=False)

    return instance


def delete_breeder(*, instance: Breeder) -> None:
    """
    Booking.breeder is on_delete=PROTECT, so deleting a breeder that already has
    bookings against it (of any status, including cancelled/completed — the FK
    itself is never nulled) would otherwise raise a raw, unhandled ProtectedError
    that surfaces to the client as a 500. Turn that into a clean, actionable 409.
    """
    image = instance.image
    try:
        instance.delete()
    except ProtectedError:
        raise AppError(
            'BREEDER_HAS_BOOKINGS', 'Cannot delete a breeder that already has bookings against it.',
            http_status=409,
        )
    if image:
        image.delete(save=False)


def create_breeder_monthly_quota(*, validated_data: dict) -> BreederMonthlyQuota:
    return BreederMonthlyQuota.objects.create(**validated_data)


@transaction.atomic
def update_breeder_monthly_quota(*, instance: BreederMonthlyQuota, validated_data: dict) -> BreederMonthlyQuota:
    for field, value in validated_data.items():
        setattr(instance, field, value)
    instance.save()
    return instance


def delete_breeder_monthly_quota(*, instance: BreederMonthlyQuota) -> None:
    instance.delete()
