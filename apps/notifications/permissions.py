from rest_framework.permissions import SAFE_METHODS, BasePermission


class NotificationPermission(BasePermission):
    """
<<<<<<< HEAD
    Read-only inbox: any authenticated user may list/retrieve (get_queryset() narrows
    to the caller's own notifications for non-admins); no create/update/delete is
    exposed since Notification rows are only ever written by other services.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated) and request.method in SAFE_METHODS
=======
    STEP9: any authenticated user may read (list/retrieve) their own notifications
    (ADMIN reads all — object-level ownership re-checked here as a second layer on
    top of queryset scoping, Global Rule #12, mirroring apps.documents.permissions.
    DocumentWritePermission). `retry` is a non-safe action and is ADMIN-only.
    """

    message = 'You do not have permission to access this notification.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
>>>>>>> origin/main

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == user.Role.ADMIN:
            return True
<<<<<<< HEAD
=======
        if request.method not in SAFE_METHODS:
            return False
>>>>>>> origin/main
        return obj.get_owner_user_id() == user.id
