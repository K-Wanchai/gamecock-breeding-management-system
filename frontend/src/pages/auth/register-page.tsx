import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { register } from '@/lib/api/auth'
import { toastApiError } from '@/lib/toast'
import type { RegisterPayload } from '@/types/auth'

const EMPTY_FORM: RegisterPayload = {
  username: '',
  email: '',
  phone: '',
  first_name: '',
  last_name: '',
  password: '',
  password_confirm: '',
}

export function RegisterPage() {
  const [form, setForm] = useState<RegisterPayload>(EMPTY_FORM)
  const navigate = useNavigate()

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      toast.success('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ')
      navigate('/login', { replace: true })
    },
    onError: toastApiError,
  })

  function update(field: keyof RegisterPayload) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    registerMutation.mutate(form)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>สมัครสมาชิก</CardTitle>
          <CardDescription>สำหรับลูกค้าที่ต้องการฝากผสมไก่ชน</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="first_name">ชื่อ</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={update('first_name')}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="last_name">นามสกุล</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={update('last_name')}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">ชื่อผู้ใช้</Label>
              <Input id="username" value={form.username} onChange={update('username')} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={update('email')}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
              <Input id="phone" value={form.phone} onChange={update('phone')} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={update('password')}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password_confirm">ยืนยันรหัสผ่าน</Label>
              <Input
                id="password_confirm"
                type="password"
                value={form.password_confirm}
                onChange={update('password_confirm')}
                required
              />
            </div>
            <Button type="submit" disabled={registerMutation.isPending} className="mt-2">
              {registerMutation.isPending ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              มีบัญชีอยู่แล้ว?{' '}
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
