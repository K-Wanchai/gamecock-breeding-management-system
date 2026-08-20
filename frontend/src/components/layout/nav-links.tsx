import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/config/nav'
import type { Role } from '@/types/auth'

interface NavLinksProps {
  role: Role
  /** Called after a link is clicked — used to close the mobile drawer on navigation. */
  onNavigate?: () => void
}

/** The nav item list itself, shared between the desktop Sidebar and the mobile Sheet drawer so the two never drift apart. */
export function NavLinks({ role, onNavigate }: NavLinksProps) {
  const items = NAV_ITEMS[role]

  return (
    <nav className="flex flex-1 flex-col gap-1 p-2">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          onClick={onNavigate}
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
  )
}
