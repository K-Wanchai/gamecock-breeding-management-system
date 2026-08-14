from rest_framework.permissions import BasePermission


class PaymentActionPermission(BasePermission):
    """
    - list/retrieve/create: any authenticated user (get_queryset() and the service
      layer narrow this further to the requester's own payments).
    - approve/reject: ADMIN only (Critical Rule #11 — a customer may never approve
      or reject their own payment).
    """

    message = 'You do not have permission to perform this action on this payment.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if view.action in ('approve', 'reject'):
            return user.role == user.Role.ADMIN
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == user.Role.ADMIN:
            return True
        if view.action in ('approve', 'reject'):
            return False
        return obj.get_owner_user_id() == user.id
