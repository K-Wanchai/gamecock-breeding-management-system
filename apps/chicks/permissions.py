from rest_framework.permissions import SAFE_METHODS, BasePermission


class ChickWritePermission(BasePermission):
    """STEP7 PERMISSION rules: ADMIN writes (creates a Chick from a hatched batch),
    CUSTOMER reads only Chicks born from their own Booking (ownership resolved via the
    full User -> Booking -> Hatching -> Chick relationship chain, see
    Chick.get_owner_user_id() — never trusts a client-supplied chick_id by itself)."""

    message = 'Only an administrator may record chick data.'

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
