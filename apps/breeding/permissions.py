from apps.core.permissions import AdminWriteOwnerReadPermission


class BreedingWritePermission(AdminWriteOwnerReadPermission):
    """
    STEP6 PERMISSION rules for BreedingEvent/Egg:
    - ADMIN: full write access (create breeding events / egg records).
    - CUSTOMER: read-only, and only for their own booking's data — there is no
      update/delete endpoint at all (Rule: "Customer -> ห้ามแก้ Timeline"), and
      object-level ownership is checked here as a second layer on top of the
      queryset scoping in the view (Global Rule #12 IDOR protection).
    """

    message = 'Only an administrator may record breeding events or egg data.'
