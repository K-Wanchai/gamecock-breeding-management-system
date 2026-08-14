from django.db import transaction

from apps.breeders.models import Breeder


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
    image = instance.image
    instance.delete()
    if image:
        image.delete(save=False)
