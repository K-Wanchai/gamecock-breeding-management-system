from django.db import transaction

from apps.hens.models import Hen


def create_hen(*, validated_data: dict, owner) -> Hen:
    return Hen.objects.create(**validated_data, owner=owner)


@transaction.atomic
def update_hen(*, instance: Hen, validated_data: dict) -> Hen:
    """Same replaced-image cleanup rule as apps.breeders.services.update_breeder."""
    old_image = instance.image
    new_image_provided = 'image' in validated_data
    new_image = validated_data.get('image')

    for field, value in validated_data.items():
        setattr(instance, field, value)
    instance.save()

    if new_image_provided and old_image and old_image != new_image:
        old_image.delete(save=False)

    return instance


def delete_hen(*, instance: Hen) -> None:
    image = instance.image
    instance.delete()
    if image:
        image.delete(save=False)
