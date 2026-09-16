import { NavLinks } from '@/components/layout/nav-links'
import { useFarmSettingQuery } from '@/hooks/use-settings'
import type { Role } from '@/types/auth'

export function Sidebar({ role }: { role: Role }) {
  const { data: farm } = useFarmSettingQuery()

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        {farm?.farm_logo ? (
          <img
            src={farm.farm_logo}
            alt="โลโก้ฟาร์ม"
            className="size-8 shrink-0 rounded-md object-cover"
          />
        ) : null}
        <span className="truncate font-semibold leading-tight">
          {farm?.farm_name ?? 'ฟาร์มไก่ชน'}
        </span>
      </div>
      <NavLinks role={role} />
    </aside>
  )
}
