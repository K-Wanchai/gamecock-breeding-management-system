import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QueryErrorProps {
  /** Optional — re-runs the failed query in place (pass a TanStack Query `refetch`). */
  onRetry?: () => void
}

/** Shown instead of the empty-state message when a query actually failed (network/5xx), not just returned zero rows. */
export function QueryError({ onRetry }: QueryErrorProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
      <AlertTriangle className="size-8" />
      <p>เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          ลองใหม่
        </Button>
      )}
    </div>
  )
}
