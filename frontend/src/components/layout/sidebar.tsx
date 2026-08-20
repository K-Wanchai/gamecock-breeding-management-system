import { NavLinks } from '@/components/layout/nav-links'
import type { Role } from '@/types/auth'

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="flex h-14 items-center border-b px-4 font-semibold">ฟาร์มไก่ชน</div>
      <NavLinks role={role} />
    </aside>
  )
}
