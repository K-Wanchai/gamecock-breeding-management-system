import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Bird,
  Search,
  ShoppingCart,
  Wallet,
  Egg,
  Feather,
  HeartPulse,
  Syringe,
  FileText,
  Bell,
  BarChart3,
  Settings,
  Activity,
} from 'lucide-react'
import type { Role } from '@/types/auth'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  /** Exact-match only — otherwise the dashboard root would stay "active" on every child route. */
  end?: boolean
}

export interface NavGroup {
  /** Section header shown above the items. Empty string = no header (for standalone items like Dashboard). */
  groupLabel: string
  /** One-line description of what this process does, shown below the header. */
  description?: string
  items: NavItem[]
}

/** Flat list for roles that don't use process groups (CUSTOMER). */
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  ADMIN: [],
  CUSTOMER: [
    { label: 'แดชบอร์ด', path: '/app', icon: LayoutDashboard, end: true },
    { label: 'แม่ไก่ของฉัน', path: '/app/hens', icon: Bird },
    { label: 'ค้นหาพ่อพันธุ์', path: '/app/breeders', icon: Search },
    { label: 'การจองของฉัน', path: '/app/bookings', icon: ShoppingCart },
    { label: 'บันทึกไทม์ไลน์การฝากผสมและการออกไข่', path: '/app/breeding-timeline', icon: Activity },
    { label: 'การชำระเงินของฉัน', path: '/app/payments', icon: Wallet },
    { label: 'ติดตามสุขภาพและการอนุบาลลูกไก่', path: '/app/care', icon: HeartPulse },
    { label: 'แจ้งเตือนของฉัน', path: '/app/notifications', icon: Bell },
  ],
}

/** Grouped nav for ADMIN — each group maps to one business process. */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: '',
    items: [
      { label: 'แดชบอร์ด', path: '/admin', icon: LayoutDashboard, end: true },
    ],
  },
  {
    groupLabel: 'Process 1 · ข้อมูลพื้นฐาน',
    description: 'จัดการข้อมูลฟาร์ม ชื่อ/ที่อยู่/บัญชีธนาคาร',
    items: [
      { label: 'ตั้งค่าระบบ', path: '/admin/settings', icon: Settings },
    ],
  },
  {
    groupLabel: 'Process 2 · พ่อพันธุ์ไก่',
    description: 'ข้อมูลพ่อพันธุ์ สายเลือด ราคา และโควตา',
    items: [
      { label: 'ข้อมูลพ่อพันธุ์ไก่', path: '/admin/breeders', icon: Bird },
    ],
  },
  {
    groupLabel: 'Process 3 · จองล็อคฝากผสม',
    description: 'จัดการคำสั่งจองและการชำระเงินเต็มจำนวน',
    items: [
      { label: 'การจองล็อคฝากผสม', path: '/admin/bookings', icon: ShoppingCart },
      { label: 'การชำระเงิน', path: '/admin/payments', icon: Wallet },
    ],
  },
  {
    groupLabel: 'Process 4 · กระบวนการผสมพันธุ์',
    description: 'รับแม่ไก่ ติดตามและอัพเดตขั้นตอนการผสม',
    items: [
      { label: 'ผสมพันธุ์', path: '/admin/breeding', icon: Egg },
    ],
  },
  {
    groupLabel: 'Process 5 · ผลผลิตและลูกไก่',
    description: 'บันทึกสุขภาพและออกเอกสารลูกไก่',
    items: [
      { label: 'บันทึกสุขภาพและการอนุบาลไก่', path: '/admin/chicks', icon: HeartPulse },
      { label: 'จัดทำเลขกิ๊ปและออกใบประวัติ', path: '/admin/wing-clip', icon: FileText },
    ],
  },
  {
    groupLabel: 'ทั่วไป',
    description: 'การแจ้งเตือน และรายงาน',
    items: [
      { label: 'การแจ้งเตือน', path: '/admin/notifications', icon: Bell },
      { label: 'รายงาน', path: '/admin/reports', icon: BarChart3 },
    ],
  },
]
