import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/config/nav'
import type { Role } from '@/types/auth'

export function Sidebar({ role }: { role: Role }) {
  const items = NAV_ITEMS[role]

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="flex h-14 items-center border-b px-4 font-semibold">ฟาร์มไก่ชน</div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
