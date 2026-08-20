import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex h-svh w-full flex-col items-center justify-center gap-3 px-4 text-center">
      <SearchX className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        ลิงก์นี้อาจไม่ถูกต้องหรือหน้านี้ถูกย้ายไปแล้ว
      </p>
      <Button asChild>
        <Link to="/">กลับหน้าแรก</Link>
      </Button>
    </div>
  )
}
