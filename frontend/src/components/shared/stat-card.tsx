import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  href?: string
  highlight?: boolean
}

export function StatCard({ label, value, icon: Icon, href, highlight }: StatCardProps) {
  const content = (
    <Card
      className={cn(
        'h-full transition-colors',
        highlight && 'border-primary',
        href && 'hover:bg-accent',
      )}
    >
      <CardContent className="flex items-center gap-4">
        {Icon && (
          <Icon className={cn('size-8', highlight ? 'text-primary' : 'text-muted-foreground')} />
        )}
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )

  return href ? (
    <Link to={href} className="block">
      {content}
    </Link>
  ) : (
    content
  )
}
