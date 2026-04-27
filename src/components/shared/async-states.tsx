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
  // Phase 6.15 iter161: SR 用に role="status" + aria-live="polite" を付与。
  // 表示瞬間に "読み込み中..." が読み上げられる (aria-busy はネスト的に親が
  // 制御すべきなのでここでは付けない、status だけで十分)。spinner icon は
  // 装飾なので aria-hidden。
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'text-muted-foreground flex flex-col items-center justify-center gap-2 py-12 text-sm',
        className,
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
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
  // Phase 6.15 iter161: 結果ゼロ状態を SR に通知 (role="status" で polite 読み上げ)。
  // 装飾 icon は ReactNode で受けるが、呼び出し側で aria-hidden を付けてもらう想定。
  return (
    <div
      role="status"
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
  // Phase 6.15 iter161: error は role="alert" で表示瞬間に SR 自動読み上げ。
  // 警告 icon は aria-hidden (message text に意味は集約済)。
  // 「再試行」button は icon-less だが aria-label に message を含めて
  //  どのエラーに対する retry か明示する。
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}
    >
      <AlertTriangle className="text-destructive h-6 w-6" aria-hidden="true" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          aria-label={`「${message}」をクリアして再試行`}
        >
          再試行
        </Button>
      )}
    </div>
  )
}
