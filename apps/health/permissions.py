from apps.core.permissions import AdminWriteOwnerReadPermission


class HealthWritePermission(AdminWriteOwnerReadPermission):
    """STEP7 PERMISSION rules: ADMIN writes, CUSTOMER reads only health records for
    Chicks born from their own Booking (ownership resolved via HealthRecord.get_owner_user_id()
    -> Chick -> Hatching -> Egg -> Booking)."""

    message = 'Only an administrator may record health data.'
