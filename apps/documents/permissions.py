from apps.core.permissions import AdminWriteOwnerReadPermission


class DocumentWritePermission(AdminWriteOwnerReadPermission):
    """
    STEP8 PERMISSION rules: ADMIN generates documents; CUSTOMER may only read
    (list/retrieve/download) documents belonging to their own booking/chick
    (object-level ownership checked here as a second layer on top of queryset
    scoping — Global Rule #12). Read actions (list/retrieve/download) are SAFE_METHODS
    (GET); generate is a POST and is ADMIN-only.
    """

    message = 'Only an administrator may generate documents.'
