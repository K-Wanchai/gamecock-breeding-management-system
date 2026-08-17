import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requestPasswordReset } from '@/lib/api/auth'
import { toastApiError } from '@/lib/toast'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  const requestReset = useMutation({
    mutationFn: requestPasswordReset,
    onError: toastApiError,
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    requestReset.mutate(email)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ลืมรหัสผ่าน</CardTitle>
          <CardDescription>
            กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requestReset.isSuccess ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-primary" />
              <p className="text-sm text-muted-foreground">
                หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งคำแนะนำสำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว
              </p>
              <Link to="/login" className="text-sm text-primary underline-offset-4 hover:underline">
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={requestReset.isPending} className="mt-2">
                {requestReset.isPending ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
