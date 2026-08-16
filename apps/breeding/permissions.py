from rest_framework.permissions import SAFE_METHODS, BasePermission


class BreedingWritePermission(BasePermission):
    """
    STEP6 PERMISSION rules for BreedingEvent/Egg:
    - ADMIN: full write access (create breeding events / egg records).
    - CUSTOMER: read-only, and only for their own booking's data — there is no
      update/delete endpoint at all (Rule: "Customer -> ห้ามแก้ Timeline"), and
      object-level ownership is checked here as a second layer on top of the
      queryset scoping in the view (Global Rule #12 IDOR protection).
    """

    message = 'Only an administrator may record breeding events or egg data.'

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
