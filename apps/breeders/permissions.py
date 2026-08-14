from rest_framework.permissions import SAFE_METHODS, BasePermission


class BreederPermission(BasePermission):
    """
    STEP4 §PART A requirement: ADMIN manages Breeder, CUSTOMER may only view it.
    Read (GET/HEAD/OPTIONS) is open to any authenticated user; every write method
    requires the ADMIN role.
    """

    message = 'Only an administrator may create, update, or delete breeders.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return user.role == user.Role.ADMIN
