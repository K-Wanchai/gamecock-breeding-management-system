import { LogOut, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth, useLogout } from '@/hooks/use-auth'

export function Navbar() {
  const { user } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()
  const profilePath = user?.role === 'ADMIN' ? '/admin/profile' : '/app/profile'

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? user.username[0]}`.toUpperCase()
    : ''

  return (
    <header className="flex h-14 items-center justify-end border-b px-4">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1.5 outline-none hover:bg-accent">
          <Avatar className="size-8">
            <AvatarFallback>{initials || <UserIcon className="size-4" />}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user?.username}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <p className="font-medium">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate(profilePath)}>
            <UserIcon className="size-4" />
            โปรไฟล์
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="size-4" />
            ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
