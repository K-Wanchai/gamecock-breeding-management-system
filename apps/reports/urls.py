from django.urls import path

from apps.reports.views import (
    BookingReportView, BreedingReportView, ChickReportView, DashboardView, EggReportView, HatchingReportView,
    PaymentReportView, RevenueReportView, SearchView,
)

app_name = 'reports'

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('search/', SearchView.as_view(), name='search'),
    path('reports/bookings/', BookingReportView.as_view(), name='report-bookings'),
    path('reports/payments/', PaymentReportView.as_view(), name='report-payments'),
    path('reports/revenue/', RevenueReportView.as_view(), name='report-revenue'),
    path('reports/breeding/', BreedingReportView.as_view(), name='report-breeding'),
    path('reports/eggs/', EggReportView.as_view(), name='report-eggs'),
    path('reports/hatchings/', HatchingReportView.as_view(), name='report-hatchings'),
    path('reports/chicks/', ChickReportView.as_view(), name='report-chicks'),
]
