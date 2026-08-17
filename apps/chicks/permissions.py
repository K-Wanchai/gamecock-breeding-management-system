from apps.core.permissions import AdminWriteOwnerReadPermission


class ChickWritePermission(AdminWriteOwnerReadPermission):
    """STEP7 PERMISSION rules: ADMIN writes (creates a Chick from a hatched batch),
    CUSTOMER reads only Chicks born from their own Booking (ownership resolved via the
    full User -> Booking -> Hatching -> Chick relationship chain, see
    Chick.get_owner_user_id() — never trusts a client-supplied chick_id by itself)."""

    message = 'Only an administrator may record chick data.'
