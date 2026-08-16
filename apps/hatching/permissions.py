from rest_framework.permissions import SAFE_METHODS, BasePermission


class HatchingWritePermission(BasePermission):
    """STEP7 PERMISSION rules: ADMIN writes (start/complete a hatching batch),
    CUSTOMER reads only their own booking's hatching batches (object-level ownership
    checked here as a second layer on top of queryset scoping — Global Rule #12)."""

    message = 'Only an administrator may record hatching data.'

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
