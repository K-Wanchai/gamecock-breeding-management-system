from apps.core.permissions import AdminWriteOwnerReadPermission


class HatchingWritePermission(AdminWriteOwnerReadPermission):
    """STEP7 PERMISSION rules: ADMIN writes (start/complete a hatching batch),
    CUSTOMER reads only their own booking's hatching batches (object-level ownership
    checked here as a second layer on top of queryset scoping — Global Rule #12)."""

    message = 'Only an administrator may record hatching data.'
