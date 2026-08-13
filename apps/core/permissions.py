"""
Shared, reusable authorization primitives — every future module (Hen, Booking,
Payment, Chick, Document, ...) plugs into these instead of writing bespoke
ownership checks per view (STEP1 §12 Data Ownership Matrix, Global Rules #11-13).
"""

from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Role-based permission: only accounts.User.Role.ADMIN may proceed."""

    message = 'This action requires an administrator account.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == user.Role.ADMIN)


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level ownership check (Global Rule #12 IDOR protection).

    ADMIN always passes. Otherwise the object must implement
    `get_owner_user_id() -> int | None`, and access is only granted when that
    id equals `request.user.id` — the authenticated user, never a client-supplied
    id (Global Rule #11).

    Any model exposed through an API that customers can reach must implement
    get_owner_user_id(); see STEP1 §12 for how each model resolves its owner.
    """

    message = 'You do not have permission to access this object.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == user.Role.ADMIN:
            return True

        get_owner_user_id = getattr(obj, 'get_owner_user_id', None)
        if get_owner_user_id is None:
            raise TypeError(
                f'{obj.__class__.__name__} must implement get_owner_user_id() to be used with IsOwnerOrAdmin'
            )
        return get_owner_user_id() == user.id
