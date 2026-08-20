import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches render-time exceptions anywhere below it so a bug in one page shows a
 * recoverable Thai error screen instead of a blank white page — React error boundaries
 * must be class components (no hook equivalent exists yet). Wrapped around the whole
 * app in App.tsx, outside the router, so it also survives errors thrown while routing.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-svh w-full flex-col items-center justify-center gap-3 px-4 text-center">
          <AlertOctagon className="size-10 text-destructive" />
          <h1 className="text-xl font-semibold">เกิดข้อผิดพลาดที่ไม่คาดคิด</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            ระบบพบปัญหาขณะแสดงผลหน้านี้ กรุณาลองโหลดหน้าใหม่อีกครั้ง
          </p>
          <Button onClick={() => window.location.reload()}>โหลดหน้าใหม่</Button>
        </div>
      )
    }

    return this.props.children
  }
}
