import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { RequireAuth, RequireRole } from '@/routes/guards'
import { RootRedirect } from '@/routes/root-redirect'
import { NotFoundPage } from '@/pages/shared/not-found-page'
import { LoginPage } from '@/pages/auth/login-page'
import { RegisterPage } from '@/pages/auth/register-page'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page'
import { ResetPasswordPage } from '@/pages/auth/reset-password-page'
import { AdminDashboardPage } from '@/pages/admin/dashboard-page'
import { CustomerDashboardPage } from '@/pages/customer/dashboard-page'
import { ProfilePage } from '@/pages/shared/profile-page'
import { HensPage } from '@/pages/customer/hens-page'
import { BreedersPage } from '@/pages/customer/breeders-page'
import { BookingsPage } from '@/pages/customer/bookings-page'
import { BookingDetailPage } from '@/pages/customer/booking-detail-page'
import { BreedingTimelinePage } from '@/pages/customer/breeding-timeline-page'
import { BreedingTimelineDetailPage } from '@/pages/customer/breeding-timeline-detail-page'
import { PaymentsPage } from '@/pages/customer/payments-page'
import { ChicksPage } from '@/pages/customer/chicks-page'
import { ChickDetailPage } from '@/pages/customer/chick-detail-page'
import { CustomerCareListPage } from '@/pages/customer/care-list-page'
import { CustomerCareDetailPage } from '@/pages/customer/care-detail-page'
import { DocumentsPage } from '@/pages/customer/documents-page'
import { NotificationsPage } from '@/pages/customer/notifications-page'
import { AdminBreedersPage } from '@/pages/admin/breeders-page'
import { AdminBreederQuotasPage } from '@/pages/admin/breeder-quotas-page'
import { AdminBookingsPage } from '@/pages/admin/bookings-page'
import { AdminBookingDetailPage } from '@/pages/admin/booking-detail-page'
import { AdminPaymentsPage } from '@/pages/admin/payments-page'
import { AdminBreedingPage } from '@/pages/admin/breeding-page'
import { AdminBreedingDetailPage } from '@/pages/admin/breeding-detail-page'
import { AdminChicksPage } from '@/pages/admin/chicks-page'
import { AdminChickDetailPage } from '@/pages/admin/chick-detail-page'
import { AdminCareDetailPage } from '@/pages/admin/care-detail-page'
import { AdminHealthPage } from '@/pages/admin/health-page'
import { AdminVaccinationsPage } from '@/pages/admin/vaccinations-page'
import { AdminDocumentsPage } from '@/pages/admin/documents-page'
import { AdminNotificationsPage } from '@/pages/admin/notifications-page'
import { ReportsHubPage } from '@/pages/admin/reports/reports-hub-page'
import { BookingReportPage } from '@/pages/admin/reports/booking-report-page'
import { PaymentReportPage } from '@/pages/admin/reports/payment-report-page'
import { RevenueReportPage } from '@/pages/admin/reports/revenue-report-page'
import { BreedingReportPage } from '@/pages/admin/reports/breeding-report-page'
import { EggReportPage } from '@/pages/admin/reports/egg-report-page'
import { HatchingReportPage } from '@/pages/admin/reports/hatching-report-page'
import { ChickReportPage } from '@/pages/admin/reports/chick-report-page'
import { AdminSearchPage } from '@/pages/admin/search-page'
import { AdminSettingsPage } from '@/pages/admin/settings-page'
import { AdminWingClipListPage } from '@/pages/admin/wing-clip-list-page'
import { AdminWingClipDetailPage } from '@/pages/admin/wing-clip-detail-page'

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole role="ADMIN" />,
        children: [
          {
            path: '/admin',
            element: <AppLayout role="ADMIN" />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'breeders', element: <AdminBreedersPage /> },
              { path: 'breeders/:id/quotas', element: <AdminBreederQuotasPage /> },
              { path: 'bookings', element: <AdminBookingsPage /> },
              { path: 'bookings/:id', element: <AdminBookingDetailPage /> },
              { path: 'payments', element: <AdminPaymentsPage /> },
              { path: 'breeding', element: <AdminBreedingPage /> },
              { path: 'breeding/:id', element: <AdminBreedingDetailPage /> },
              { path: 'chicks', element: <AdminChicksPage /> },
              { path: 'chicks/:id', element: <AdminChickDetailPage /> },
              { path: 'care/:id', element: <AdminCareDetailPage /> },
              { path: 'health', element: <AdminHealthPage /> },
              { path: 'vaccinations', element: <AdminVaccinationsPage /> },
              { path: 'documents', element: <AdminDocumentsPage /> },
              { path: 'notifications', element: <AdminNotificationsPage /> },
              { path: 'reports', element: <ReportsHubPage /> },
              { path: 'reports/bookings', element: <BookingReportPage /> },
              { path: 'reports/payments', element: <PaymentReportPage /> },
              { path: 'reports/revenue', element: <RevenueReportPage /> },
              { path: 'reports/breeding', element: <BreedingReportPage /> },
              { path: 'reports/eggs', element: <EggReportPage /> },
              { path: 'reports/hatchings', element: <HatchingReportPage /> },
              { path: 'reports/chicks', element: <ChickReportPage /> },
              { path: 'search', element: <AdminSearchPage /> },
              { path: 'settings', element: <AdminSettingsPage /> },
              { path: 'wing-clip', element: <AdminWingClipListPage /> },
              { path: 'wing-clip/:id', element: <AdminWingClipDetailPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireRole role="CUSTOMER" />,
        children: [
          {
            path: '/app',
            element: <AppLayout role="CUSTOMER" />,
            children: [
              { index: true, element: <CustomerDashboardPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'hens', element: <HensPage /> },
              { path: 'breeders', element: <BreedersPage /> },
              { path: 'bookings', element: <BookingsPage /> },
              { path: 'bookings/:id', element: <BookingDetailPage /> },
              { path: 'breeding-timeline', element: <BreedingTimelinePage /> },
              { path: 'breeding-timeline/:id', element: <BreedingTimelineDetailPage /> },
              { path: 'payments', element: <PaymentsPage /> },
              { path: 'chicks', element: <ChicksPage /> },
              { path: 'chicks/:id', element: <ChickDetailPage /> },
              { path: 'care', element: <CustomerCareListPage /> },
              { path: 'care/:id', element: <CustomerCareDetailPage /> },
              { path: 'documents', element: <DocumentsPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
