import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { confirmPasswordReset } from '@/lib/api/auth'
import { toastApiError } from '@/lib/toast'
import { toast } from 'sonner'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [uid, setUid] = useState(searchParams.get('uid') ?? '')
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const confirmReset = useMutation({
    mutationFn: confirmPasswordReset,
    onError: toastApiError,
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน', { description: 'กรุณายืนยันรหัสผ่านใหม่ให้ตรงกัน' })
      return
    }
    confirmReset.mutate({ uid, token, new_password: newPassword })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ตั้งรหัสผ่านใหม่</CardTitle>
          <CardDescription>
            กรอกรหัส uid และ token ที่ได้รับจากอีเมล พร้อมตั้งรหัสผ่านใหม่
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmReset.isSuccess ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-primary" />
              <p className="text-sm text-muted-foreground">
                ตั้งรหัสผ่านใหม่สำเร็จแล้ว กรุณาเข้าสู่ระบบอีกครั้ง
              </p>
              <Link to="/login" className="text-sm text-primary underline-offset-4 hover:underline">
                ไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="uid">uid</Label>
                <Input id="uid" value={uid} onChange={(e) => setUid(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="token">token</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new_password">รหัสผ่านใหม่</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm_password">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={confirmReset.isPending} className="mt-2">
                {confirmReset.isPending ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
