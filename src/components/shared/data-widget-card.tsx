/**
 * iter (post-loop, leverage substrate): widget 全体で共有する Card shell。
 *
 * 設計目的 (FEEDBACK_QUEUE.md fluffy → widget series 8 件 + methodology view 9 件 で再利用):
 *   - header (icon + title + 件数 chip + 任意 right-side action) を共通化
 *   - loading / empty / error state を一元化 (skeleton / EmptyState / 1 行エラー)
 *   - children に widget 本体 (list / chart / chip 群) を slot で渡す
 *
 * 既存 (refactor 候補): TaskChute view / Calendar diff-summary / today-view group panel /
 * goals-panel sections — 同 pattern のヘッダ + 件数 + 本体 を持つ Card が多数。
 *
 * 使い方:
 *   <DataWidgetCard
 *     title="今日の作戦盤"
 *     icon={<Sparkles className="h-4 w-4" />}
 *     count={5}
 *     loading={q.isLoading}
 *     empty={items.length === 0}
 *     emptyTitle="今日やる task は空です"
 *     emptyDescription="ルーティンを投入するか quick-add で..."
 *     error={q.error}
 *     headerRight={<Button size="sm">設定</Button>}
 *   >
 *     <ol>{...}</ol>
 *   </DataWidgetCard>
 */
import { type ReactNode, useId } from 'react'

import { AlertTriangle, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

import { EmptyState } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  title: string
  /** lucide-react icon を直接渡す (通常 h-4 w-4) */
  icon?: ReactNode
  /** ヘッダ右上に件数 chip を出したい場合 (undefined で非表示) */
  count?: number
  /** loading state — skeleton 表示 */
  loading?: boolean
  /** empty state を出すか (件数 0 / no data) */
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /** error 発生時 (Error or 文字列)。null/undefined なら error 表示しない */
  error?: unknown
  /** ヘッダ右側に置く action (Button / icon button 等) */
  headerRight?: ReactNode
  /** Card の追加 className (height 制約等) */
  className?: string
  /** body の追加 className (padding override 等) */
  contentClassName?: string
  /** body slot — widget 本体 */
  children?: ReactNode
  testId?: string
}

function getErrorMessage(error: unknown): string {
  if (!error) return ''
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '読み込みに失敗しました'
}

export function DataWidgetCard({
  title,
  icon,
  count,
  loading,
  empty,
  emptyTitle = 'データがありません',
  emptyDescription,
  error,
  headerRight,
  className,
  contentClassName,
  children,
  testId,
}: Props) {
  const errorMsg = getErrorMessage(error)
  // iter930: region aria-label と CardTitle visible (title + count chip) が同 content
  // を持っていたため SR が landmark + heading 2 経路 で同 string を announce。
  // useId で安定 id 生成 + aria-labelledby で region/heading 1 source 集約
  // (iter926 dashboard MUST / iter928/929 region sweep の DataWidgetCard 横展開、
  // 本 component を使う全 widget が一気に 1 source 化)。
  const headingId = useId()

  return (
    <Card className={cn(className)} data-testid={testId} role="region" aria-labelledby={headingId}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle
            id={headingId}
            className="flex flex-1 items-center gap-1.5 text-sm"
            role="heading"
            aria-level={2}
          >
            {icon ? <span aria-hidden="true">{icon}</span> : null}
            <span>{title}</span>
            {count !== undefined ? (
              <span className="text-muted-foreground ml-auto text-[11px] font-normal tabular-nums">
                {count} 件
              </span>
            ) : null}
          </CardTitle>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn(contentClassName)}>
        {loading ? (
          // iter1317: ASCII "..." (U+002E×3) → Unicode "…" (U+2026) で codebase ellipsis
          // convention 統一 (iter1091 sweep の続き、shared/async-states / form 系既統一)。
          // role="status" 経路で WCAG 2.5.3 divergence は無いが SR 読み上げの一貫性 (3 dot vs
          // 1 ellipsis character) を確保。
          <div
            role="status"
            aria-live="polite"
            className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm"
          >
            <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
            読み込み中…
          </div>
        ) : errorMsg ? (
          <div
            role="alert"
            className="text-destructive flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900/50 dark:bg-rose-950/30"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        ) : empty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
