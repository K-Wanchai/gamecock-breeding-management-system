import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-muted-foreground', className)} />
}

export function FullPageLoading() {
  return (
    <div className="flex h-svh w-full items-center justify-center">
      <Spinner className="size-8" />
    </div>
  )
}

export function SectionLoading() {
  return (
    <div className="flex w-full items-center justify-center py-16">
      <Spinner className="size-8" />
    </div>
  )
}
