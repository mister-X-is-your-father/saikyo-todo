/**
 * Loading / Empty / Error の表示を 1 箇所に集約。Component から `<Loading />` 等で呼ぶ。
 */
import type { ReactNode } from 'react'

import { AlertTriangle, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

export function Loading({
  message = '読み込み中...',
  className,
}: {
  message?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-col items-center justify-center gap-2 py-12 text-sm',
        className,
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{message}</span>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
    >
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}
    >
      <AlertTriangle className="text-destructive h-6 w-6" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          再試行
        </Button>
      )}
    </div>
  )
}
