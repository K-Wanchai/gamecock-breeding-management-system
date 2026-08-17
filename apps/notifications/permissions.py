from rest_framework.permissions import SAFE_METHODS, BasePermission


class NotificationPermission(BasePermission):
    """
    Read-only inbox: any authenticated user may list/retrieve (get_queryset() narrows
    to the caller's own notifications for non-admins); no create/update/delete is
    exposed since Notification rows are only ever written by other services.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated) and request.method in SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == user.Role.ADMIN:
            return True
        return obj.get_owner_user_id() == user.id
