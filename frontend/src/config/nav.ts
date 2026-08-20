import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Bird,
  Search,
  CalendarClock,
  Wallet,
  Egg,
  Feather,
  HeartPulse,
  Syringe,
  FileText,
  Bell,
  MessageCircle,
  BarChart3,
} from 'lucide-react'
import type { Role } from '@/types/auth'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  /** Exact-match only — otherwise the dashboard root would stay "active" on every child route. */
  end?: boolean
}

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'แดชบอร์ด', path: '/admin', icon: LayoutDashboard, end: true },
    { label: 'ข้อมูลพ่อพันธุ์', path: '/admin/breeders', icon: Bird },
    { label: 'การจองคิว', path: '/admin/bookings', icon: CalendarClock },
    { label: 'การชำระเงิน', path: '/admin/payments', icon: Wallet },
    { label: 'กระบวนการผสมพันธุ์', path: '/admin/breeding', icon: Egg },
    { label: 'ลูกไก่', path: '/admin/chicks', icon: Feather },
    { label: 'สุขภาพ', path: '/admin/health', icon: HeartPulse },
    { label: 'วัคซีน', path: '/admin/vaccinations', icon: Syringe },
    { label: 'เอกสาร', path: '/admin/documents', icon: FileText },
    { label: 'การแจ้งเตือน', path: '/admin/notifications', icon: Bell },
    { label: 'รายงาน', path: '/admin/reports', icon: BarChart3 },
    { label: 'ค้นหา', path: '/admin/search', icon: Search },
  ],
  CUSTOMER: [
    { label: 'แดชบอร์ด', path: '/app', icon: LayoutDashboard, end: true },
    { label: 'แม่ไก่ของฉัน', path: '/app/hens', icon: Bird },
    { label: 'ค้นหาพ่อพันธุ์', path: '/app/breeders', icon: Search },
    { label: 'การจองของฉัน', path: '/app/bookings', icon: CalendarClock },
    { label: 'การชำระเงินของฉัน', path: '/app/payments', icon: Wallet },
    { label: 'ลูกไก่ของฉัน', path: '/app/chicks', icon: Feather },
    { label: 'เอกสารของฉัน', path: '/app/documents', icon: FileText },
    { label: 'แจ้งเตือนของฉัน', path: '/app/notifications', icon: Bell },
    { label: 'เชื่อมบัญชี LINE', path: '/app/line-link', icon: MessageCircle },
  ],
}
