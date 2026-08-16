from rest_framework.permissions import SAFE_METHODS, BasePermission


class DocumentWritePermission(BasePermission):
    """
    STEP8 PERMISSION rules: ADMIN generates documents; CUSTOMER may only read
    (list/retrieve/download) documents belonging to their own booking/chick
    (object-level ownership checked here as a second layer on top of queryset
    scoping — Global Rule #12). Read actions (list/retrieve/download) are SAFE_METHODS
    (GET); generate is a POST and is ADMIN-only.
    """

    message = 'Only an administrator may generate documents.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return user.role == user.Role.ADMIN

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == user.Role.ADMIN:
            return True
        if request.method not in SAFE_METHODS:
            return False
        return obj.get_owner_user_id() == user.id
