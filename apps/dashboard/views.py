from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import AppError
from apps.dashboard import services
from apps.dashboard.serializers import DashboardSummarySerializer


class DashboardSummaryView(APIView):
    """
    GET /api/v1/dashboard/ (STEP18) — booking counts by status, chick count, and total
    outstanding payment amount for the logged-in customer. Admin-side dashboard is
    different in shape (system-wide, not "my own") and out of scope for this step.
    """

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if request.user.role != request.user.Role.CUSTOMER:
            raise AppError('CUSTOMER_ONLY', 'This dashboard is only available to customer accounts.', http_status=403)

        summary = services.get_customer_dashboard_summary(request.user)
        return Response(DashboardSummarySerializer(summary).data)
