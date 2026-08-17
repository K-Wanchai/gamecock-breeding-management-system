import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { PlaceholderPage } from '@/components/shared/placeholder-page'
import { RequireAuth, RequireRole } from '@/routes/guards'
import { RootRedirect } from '@/routes/root-redirect'
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
import { PaymentsPage } from '@/pages/customer/payments-page'
import { ChicksPage } from '@/pages/customer/chicks-page'
import { ChickDetailPage } from '@/pages/customer/chick-detail-page'
import { DocumentsPage } from '@/pages/customer/documents-page'
import { NotificationsPage } from '@/pages/customer/notifications-page'
import { LineLinkPage } from '@/pages/customer/line-link-page'
import { AdminBreedersPage } from '@/pages/admin/breeders-page'
import { AdminBreederQuotasPage } from '@/pages/admin/breeder-quotas-page'

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
              { path: 'bookings', element: <PlaceholderPage title="การจองคิว" /> },
              { path: 'payments', element: <PlaceholderPage title="การชำระเงิน" /> },
              { path: 'breeding', element: <PlaceholderPage title="กระบวนการผสมพันธุ์" /> },
              { path: 'chicks', element: <PlaceholderPage title="ลูกไก่" /> },
              { path: 'health', element: <PlaceholderPage title="สุขภาพ" /> },
              { path: 'vaccinations', element: <PlaceholderPage title="วัคซีน" /> },
              { path: 'documents', element: <PlaceholderPage title="เอกสาร" /> },
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
              { path: 'payments', element: <PaymentsPage /> },
              { path: 'chicks', element: <ChicksPage /> },
              { path: 'chicks/:id', element: <ChickDetailPage /> },
              { path: 'documents', element: <DocumentsPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'line-link', element: <LineLinkPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
