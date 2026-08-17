import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { changePassword, updateProfile } from '@/lib/api/auth'
import { toastApiError } from '@/lib/toast'
import type { ProfileUpdatePayload } from '@/types/auth'

function ProfileInfoCard() {
  const { user } = useAuth()
  const setUser = useAuthStore((state) => state.setUser)
  const [form, setForm] = useState<ProfileUpdatePayload>({
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
  })

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      toast.success('บันทึกข้อมูลส่วนตัวสำเร็จ')
    },
    onError: toastApiError,
  })

  function update(field: keyof ProfileUpdatePayload) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    updateProfileMutation.mutate(form)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ข้อมูลส่วนตัว</CardTitle>
        <CardDescription>ชื่อผู้ใช้: {user?.username}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" type="email" value={form.email} onChange={update('email')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input id="phone" value={form.phone} onChange={update('phone')} />
          </div>
          <Button type="submit" disabled={updateProfileMutation.isPending} className="w-fit">
            {updateProfileMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ChangePasswordCard() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clear)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      // Backend blacklists every outstanding refresh token (including this session's) on
      // password change, so the current refresh token is already dead — sign out locally
      // instead of calling /auth/logout, which would just 400 on the now-invalid token.
      clearAuth()
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง')
      navigate('/login', { replace: true })
    },
    onError: toastApiError,
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านใหม่ไม่ตรงกัน', { description: 'กรุณายืนยันรหัสผ่านใหม่ให้ตรงกัน' })
      return
    }
    changePasswordMutation.mutate({
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: confirmPassword,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
        <CardDescription>
          เมื่อเปลี่ยนรหัสผ่านสำเร็จ ระบบจะให้เข้าสู่ระบบใหม่อีกครั้ง
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="old_password">รหัสผ่านปัจจุบัน</Label>
            <Input
              id="old_password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
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
            <Label htmlFor="new_password_confirm">ยืนยันรหัสผ่านใหม่</Label>
            <Input
              id="new_password_confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={changePasswordMutation.isPending} className="w-fit">
            {changePasswordMutation.isPending ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function ProfilePage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">โปรไฟล์</h1>
      <ProfileInfoCard />
      <ChangePasswordCard />
    </div>
  )
}
