import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  pageSize: number
  count: number
  onPageChange: (page: number) => void
}

/** Page-number pagination bar matching DRF's PageNumberPagination (count/next/previous). */
export function Pagination({ page, pageSize, count, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  if (totalPages <= 1) return null

  const from = count === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-muted-foreground">
        {from}-{to} จาก {count} รายการ
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm">
          หน้า {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="หน้าถัดไป"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
