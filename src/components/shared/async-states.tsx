/**
 * Loading / Empty / Error の表示を 1 箇所に集約。Component から `<Loading />` 等で呼ぶ。
 */
import type { ReactNode } from 'react'

import { AlertTriangle, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

export function Loading({
  message = '読み込み中…',
  className,
}: {
  message?: string
  className?: string
}) {
  // Phase 6.15 iter161: SR 用に role="status" + aria-live="polite" を付与。
  // 表示瞬間に "読み込み中…" が読み上げられる (aria-busy はネスト的に親が
  // 制御すべきなのでここでは付けない、status だけで十分)。spinner icon は
  // 装飾なので aria-hidden。
  // iter1091: codebase convention 統一 (visible "..." ASCII → "…" U+2026)。
  // role="status" 経路で visible テキストがそのまま SR テキストになるため WCAG 2.5.3
  // divergence は無いが、他の form 系 (login-form / signup-form / mock-* / quick-add /
  // create-time-entry-form) と ellipsis character を合わせて codebase consistency 確保。
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'text-muted-foreground flex flex-col items-center justify-center gap-2 py-12 text-sm',
        className,
      )}
    >
      <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
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
  // iter273: 一般ユーザ向けに <code> + 例文を埋めた JSX を渡せるように ReactNode に
  // 広げた。文字列も従来どおり OK (代入互換)。
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  // Phase 6.15 iter161: 結果ゼロ状態を SR に通知 (role="status" で polite 読み上げ)。
  // 装飾 icon は ReactNode で受けるが、呼び出し側で aria-hidden を付けてもらう想定。
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
    >
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        // iter396: <p> から <div> に変更。description は ReactNode (iter273 で
        // <code> や複数 <p> を含む JSX も渡せるように拡張済) のため `<p>` で
        // wrap すると caller 側の <p> と nested で hydration error になる。
        // text-sm + max-w 等の visual styling は `<div>` でも同等。
        <div className="text-muted-foreground max-w-md text-sm">{description}</div>
      )}
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
          className="min-h-11"
          onClick={onRetry}
          // iter1151: 旧 aria-label `「message」をクリアして再試行` は visible "再試行"
          // を末尾に持ち voice control prefix-matching「click 再試行」 match 不可。
          // iter1093-1150 sweep convention に揃え visible "再試行" 冒頭固定 +
          // em-dash 区切で error message を descriptive 末尾保持。
          // iter1767: aria-label は browser tooltip にならないため、sighted は hover で
          // エラー再試行の context を即把握できなかった。title 付与で同 text の disclosure
          // (iter1763-1765 icon-only button family 同 pattern を共通 ErrorState retry button にも展開、
          // 1 共通 component 修正で全 caller の retry UX 一括改善)。
          aria-label={`再試行 — 「${message}」をクリアして再試行`}
          title={`再試行 — 「${message}」をクリアして再試行`}
        >
          <span aria-hidden="true">再試行</span>
        </Button>
      )}
    </div>
  )
}
