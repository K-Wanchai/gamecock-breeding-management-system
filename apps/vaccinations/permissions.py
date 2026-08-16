from rest_framework.permissions import SAFE_METHODS, BasePermission


class VaccinationWritePermission(BasePermission):
    """STEP7 PERMISSION rules: ADMIN writes, CUSTOMER reads only vaccination records for
    Chicks born from their own Booking (ownership resolved via Vaccination.get_owner_user_id()
    -> Chick -> Hatching -> Egg -> Booking)."""

    message = 'Only an administrator may record vaccination data.'

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
