import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { useRequestLineLinkCode } from '@/hooks/use-notifications'
import { fetchMe } from '@/lib/api/auth'
import { toastApiError } from '@/lib/toast'
import type { LineLinkCode } from '@/types/notification'

const POLL_INTERVAL_MS = 3000

export function LineLinkPage() {
  const { user } = useAuth()
  const setUser = useAuthStore((state) => state.setUser)
  const [activeCode, setActiveCode] = useState<LineLinkCode | null>(null)

  const isLinked = Boolean(user?.line_user_id)
  const requestCode = useRequestLineLinkCode()

  // Polls /auth/me while a code is outstanding so this page notices as soon as the
  // LINE webhook confirms the link — the webhook itself has no channel back to this
  // browser tab, so polling is the only way to find out without a manual reload.
  // refetchIntervalInBackground stays on: the whole point of this flow is the user
  // switching away to the LINE app (or another tab) to send the code, which is exactly
  // when a backgrounded tab would otherwise have its polling paused by default.
  const meQuery = useQuery({
    queryKey: ['auth', 'me', 'line-link-poll'],
    queryFn: fetchMe,
    enabled: Boolean(activeCode) && !isLinked,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (meQuery.data?.line_user_id) {
      setUser(meQuery.data)
    }
  }, [meQuery.data, setUser])

  function handleRequestCode() {
    requestCode.mutate(undefined, {
      onSuccess: setActiveCode,
      onError: toastApiError,
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold">เชื่อมบัญชี LINE</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-5" />
            สถานะการเชื่อมบัญชี
          </CardTitle>
          <CardDescription>เชื่อมบัญชี LINE เพื่อรับการแจ้งเตือนผ่าน LINE</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLinked ? (
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="size-5" />
              <span className="font-medium">เชื่อมบัญชี LINE แล้ว</span>
            </div>
          ) : activeCode ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-md border bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">รหัสเชื่อมบัญชีของคุณ</p>
                <p className="text-3xl font-bold tracking-widest">{activeCode.code}</p>
              </div>
              <ol className="list-inside list-decimal text-sm text-muted-foreground">
                <li>เพิ่มเพื่อน LINE Official Account ของฟาร์ม</li>
                <li>
                  ส่งข้อความพิมพ์ตัวเลข{' '}
                  <span className="font-medium text-foreground">{activeCode.code}</span> ไปในแชท
                </li>
                <li>รอสักครู่ ระบบจะยืนยันการเชื่อมบัญชีให้อัตโนมัติ</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                รหัสหมดอายุ: {new Date(activeCode.expires_at).toLocaleString('th-TH')}
              </p>
              <Button
                variant="outline"
                onClick={handleRequestCode}
                disabled={requestCode.isPending}
              >
                {requestCode.isPending ? 'กำลังขอรหัสใหม่...' : 'ขอรหัสใหม่'}
              </Button>
            </div>
          ) : (
            <Button onClick={handleRequestCode} disabled={requestCode.isPending} className="w-fit">
              {requestCode.isPending ? 'กำลังขอรหัส...' : 'ขอรหัสเชื่อมบัญชี LINE'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
