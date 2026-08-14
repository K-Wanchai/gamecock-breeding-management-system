from rest_framework.permissions import BasePermission


class BookingActionPermission(BasePermission):
    """
    - list/retrieve/create: any authenticated user (get_queryset() and the service
      layer narrow this further — customers only ever see/act on their own bookings).
    - approve: ADMIN only (Critical Rule #12 — a customer may never approve their
      own booking).
    - cancel: the owning customer or ADMIN. Object-level check here only gates
      *who*; the state-machine rule about *when* a customer may still cancel lives
      in apps.bookings.services.cancel_booking.
    """

    message = 'You do not have permission to perform this action on this booking.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if view.action == 'approve':
            return user.role == user.Role.ADMIN
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == user.Role.ADMIN:
            return True
        if view.action == 'approve':
            return False
        return obj.get_owner_user_id() == user.id
