from apps.core.permissions import AdminWriteOwnerReadPermission


class VaccinationWritePermission(AdminWriteOwnerReadPermission):
    """STEP7 PERMISSION rules: ADMIN writes, CUSTOMER reads only vaccination records for
    Chicks born from their own Booking (ownership resolved via Vaccination.get_owner_user_id()
    -> Chick -> Hatching -> Egg -> Booking)."""

    message = 'Only an administrator may record vaccination data.'
