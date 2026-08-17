import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLogin } from '@/hooks/use-auth'
import { ApiError, normalizeApiError } from '@/lib/api/errors'
import { toastApiError } from '@/lib/toast'

function handleLoginError(error: unknown) {
  const apiError = error instanceof ApiError ? error : normalizeApiError(error)
  if (apiError.status === 429) {
    toast.error('พยายามเข้าสู่ระบบบ่อยเกินไป', {
      description: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
    })
    return
  }
  toastApiError(apiError)
}

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    login.mutate({ username, password }, { onError: handleLoginError })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>เข้าสู่ระบบ</CardTitle>
          <CardDescription>ระบบจัดการการฝากผสมไก่ชน</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">ชื่อผู้ใช้</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  ลืมรหัสผ่าน?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={login.isPending} className="mt-2">
              {login.isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ยังไม่มีบัญชี?{' '}
              <Link to="/register" className="text-primary underline-offset-4 hover:underline">
                สมัครสมาชิก
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
