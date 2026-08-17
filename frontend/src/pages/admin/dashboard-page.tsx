import { useAuth } from '@/hooks/use-auth'

export function AdminDashboardPage() {
  const { user } = useAuth()
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">แดชบอร์ดผู้ดูแลระบบ</h1>
      <p className="text-muted-foreground">ยินดีต้อนรับ, {user?.first_name || user?.username}</p>
    </div>
  )
}
