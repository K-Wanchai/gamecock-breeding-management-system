import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { CalendarClock, Wallet, TrendingUp, Dna, Egg, Bird, Feather } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ReportLink {
  label: string
  description: string
  path: string
  icon: LucideIcon
}

const REPORTS: ReportLink[] = [
  { label: 'การจอง', description: 'ยอดจอง สถานะ และมูลค่าการจองทั้งหมด', path: '/admin/reports/bookings', icon: CalendarClock },
  { label: 'การชำระเงิน', description: 'รายการชำระเงินตามสถานะและช่วงเวลา', path: '/admin/reports/payments', icon: Wallet },
  { label: 'รายได้', description: 'รายได้รวม แยกตามเดือนและพ่อพันธุ์', path: '/admin/reports/revenue', icon: TrendingUp },
  { label: 'กระบวนการผสมพันธุ์', description: 'เหตุการณ์ผสมพันธุ์ทุกขั้นตอน', path: '/admin/reports/breeding', icon: Dna },
  { label: 'ไข่', description: 'จำนวนไข่ อัตราไข่ดีในแต่ละชุด', path: '/admin/reports/eggs', icon: Egg },
  { label: 'การฟักไข่', description: 'อัตราการฟักและอัตรารอดชีวิต', path: '/admin/reports/hatchings', icon: Bird },
  { label: 'ลูกไก่', description: 'ลูกไก่ทั้งหมดแยกตามสถานะและเพศ', path: '/admin/reports/chicks', icon: Feather },
]

export function ReportsHubPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">รายงาน</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <Link key={report.path} to={report.path} className="block">
            <Card className="h-full transition-colors hover:bg-accent">
              <CardContent className="flex items-start gap-4">
                <report.icon className="size-8 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">{report.label}</p>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
