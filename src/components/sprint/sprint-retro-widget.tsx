/**
 * iter527 (queue fluffy-3 retro→widget): Sprint Retrospective 数値レポート widget。
 *
 * 設計目的 (FEEDBACK_QUEUE.md fluffy 撲滅原則):
 *   - AI が KPT 感想文を書く現状の retro-service.ts (fluffy: 「進捗良好でした」的) を
 *     deterministic な数値レポート + 1 行 trend 表示に置換
 *   - widget 本体は `buildSprintRetroSummary` (iter523 着地) を消費するだけ、
 *     副作用 / AI 不使用
 *
 * 表示 (DataWidgetCard shell + SeverityChip 統一 token):
 *   - 完了率 (large 数字 + progress bar、severity tone connect: ≥75 ok / ≥50 info /
 *     ≥25 warn / <25 danger)
 *   - planned vs delivered (件数 + delta)
 *   - status 分布 (todo / in_progress / blocked / done / cancelled)
 *   - rootCauses 4 chip (overdueDelivery / incompleteOnTime / cancelledMid / blockedAtClose)
 *   - 前 sprint との trend (↑ / ↓ / →) + completionDelta 表示 (prevItems 指定時のみ)
 */
import { AlertOctagon, Ban, Lock, Minus, TrendingDown, TrendingUp, Trophy } from 'lucide-react'

import {
  buildSprintRetroSummary,
  completionRateSeverity,
  completionRateSeverityLabelJa,
  type SprintRetroItemFields,
  type SprintRetroSummary,
} from '@/features/sprint/retro-summary'

import { DataWidgetCard } from '@/components/shared/data-widget-card'
import { SeverityChip } from '@/components/shared/severity-chip'

interface Props {
  items: readonly SprintRetroItemFields[]
  prevItems?: readonly SprintRetroItemFields[]
  /** sprint 終了日 (ISO YYYY-MM-DD)。incompleteOnTime / overdueDelivery 判定基準 */
  sprintEndISO?: string
  /** Card の className override (高さ制約等) */
  className?: string
}

// iter528: completionRateSeverity / completionRateSeverityLabelJa は retro-summary.ts の
// pure helper 化、本 widget は public API を直接呼ぶ。

function trendIcon(trend: 'up' | 'down' | 'flat') {
  if (trend === 'up') {
    return <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden="true" />
  }
  if (trend === 'down') {
    return <TrendingDown className="h-4 w-4 text-rose-600" aria-hidden="true" />
  }
  return <Minus className="h-4 w-4 text-slate-500" aria-hidden="true" />
}

function trendLabel(trend: 'up' | 'down' | 'flat'): string {
  return trend === 'up' ? '改善' : trend === 'down' ? '悪化' : '横ばい'
}

export function SprintRetroWidget({ items, prevItems, sprintEndISO, className }: Props) {
  const summary: SprintRetroSummary = buildSprintRetroSummary(items, {
    prevItems,
    sprintEndISO,
  })
  const sev = completionRateSeverity(summary.completionRate)
  const empty = summary.total === 0

  const { delivered, planned, delta } = summary.plannedVsDelivered
  const breakdown = summary.statusBreakdown
  const rc = summary.rootCauses
  const cmp = summary.comparisonWithPrev

  return (
    <DataWidgetCard
      title="Sprint 数値レポート"
      icon={<Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />}
      count={summary.total}
      empty={empty}
      emptyTitle="この Sprint には item がありません"
      emptyDescription="Sprint に item を割当てると数値レポートがここに出ます"
      className={className}
      testId="sprint-retro-widget"
    >
      <div className="space-y-4">
        {/* 完了率 + progress bar */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium">完了率</span>
            <span className="text-2xl font-semibold tabular-nums">
              {summary.completionRate}
              <span className="text-muted-foreground ml-0.5 text-sm">%</span>
            </span>
          </div>
          <div
            className="bg-muted h-2 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={summary.completionRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="完了率"
            aria-valuetext={`${summary.completionRate}% (${completionRateSeverityLabelJa(sev)})`}
          >
            <div
              className={
                sev === 'ok'
                  ? 'h-full bg-emerald-500'
                  : sev === 'info'
                    ? 'h-full bg-sky-500'
                    : sev === 'warn'
                      ? 'h-full bg-amber-500'
                      : 'h-full bg-rose-500'
              }
              style={{ width: `${summary.completionRate}%` }}
            />
          </div>
        </div>

        {/* planned vs delivered */}
        <dl className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">計画</dt>
            <dd className="text-base font-semibold tabular-nums">{planned}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">納品</dt>
            <dd className="text-base font-semibold tabular-nums">{delivered}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">差分</dt>
            <dd
              className={`text-base font-semibold tabular-nums ${delta < 0 ? 'text-rose-700' : delta > 0 ? 'text-emerald-700' : ''}`}
            >
              {delta > 0 ? '+' : ''}
              {delta}
            </dd>
          </div>
        </dl>

        {/* status 分布 */}
        <div>
          <h3
            id="sprint-retro-status-heading"
            className="text-muted-foreground mb-1 text-xs font-normal"
          >
            Status 分布
          </h3>
          <div
            className="flex flex-wrap gap-1.5 text-xs"
            role="group"
            aria-labelledby="sprint-retro-status-heading"
          >
            <StatusChip label="todo" count={breakdown.todo} />
            <StatusChip label="進行中" count={breakdown.inProgress} />
            <StatusChip label="blocked" count={breakdown.blocked} tone="warn" />
            <StatusChip label="done" count={breakdown.done} tone="ok" />
            <StatusChip label="cancelled" count={breakdown.cancelled} tone="muted" />
          </div>
        </div>

        {/* rootCauses */}
        {(rc.overdueDelivery > 0 ||
          rc.incompleteOnTime > 0 ||
          rc.cancelledMid > 0 ||
          rc.blockedAtClose > 0) && (
          <div>
            <h3
              id="sprint-retro-causes-heading"
              className="text-muted-foreground mb-1 text-xs font-normal"
            >
              落ちた item の主因
            </h3>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-labelledby="sprint-retro-causes-heading"
            >
              {rc.incompleteOnTime > 0 && (
                <SeverityChip
                  severity="danger"
                  icon={<AlertOctagon className="h-3 w-3" aria-hidden="true" />}
                  label="期限内未完"
                  delta={rc.incompleteOnTime}
                  ariaLabel={`期限内未完 ${rc.incompleteOnTime} 件`}
                  testId="retro-cause-incomplete"
                />
              )}
              {rc.overdueDelivery > 0 && (
                <SeverityChip
                  severity="warn"
                  icon={<AlertOctagon className="h-3 w-3" aria-hidden="true" />}
                  label="遅延納品"
                  delta={rc.overdueDelivery}
                  ariaLabel={`遅延納品 ${rc.overdueDelivery} 件`}
                  testId="retro-cause-overdue"
                />
              )}
              {rc.blockedAtClose > 0 && (
                <SeverityChip
                  severity="warn"
                  icon={<Lock className="h-3 w-3" aria-hidden="true" />}
                  label="blocked のまま"
                  delta={rc.blockedAtClose}
                  ariaLabel={`blocked のまま ${rc.blockedAtClose} 件`}
                  testId="retro-cause-blocked"
                />
              )}
              {rc.cancelledMid > 0 && (
                <SeverityChip
                  severity="muted"
                  icon={<Ban className="h-3 w-3" aria-hidden="true" />}
                  label="計画外し"
                  delta={rc.cancelledMid}
                  ariaLabel={`cancelled ${rc.cancelledMid} 件`}
                  testId="retro-cause-cancelled"
                />
              )}
            </div>
          </div>
        )}

        {/* 前 sprint との比較 */}
        {cmp && (
          <div
            className="bg-muted/40 flex items-center gap-2 rounded p-2 text-xs"
            data-testid="retro-comparison"
          >
            {trendIcon(cmp.trend)}
            <span className="font-medium">前 Sprint 比 {trendLabel(cmp.trend)}</span>
            <span className="text-muted-foreground tabular-nums">
              完了率 {cmp.completionDelta > 0 ? '+' : ''}
              {cmp.completionDelta}pt / 納品 {cmp.doneDelta > 0 ? '+' : ''}
              {cmp.doneDelta} 件
            </span>
          </div>
        )}
      </div>
    </DataWidgetCard>
  )
}

function StatusChip({
  label,
  count,
  tone,
}: {
  label: string
  count: number
  tone?: 'ok' | 'warn' | 'muted'
}) {
  if (count === 0) return null
  const cls =
    tone === 'ok'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
      : tone === 'warn'
        ? 'border-amber-300 bg-amber-50 text-amber-700'
        : tone === 'muted'
          ? 'border-slate-300 bg-slate-100 text-slate-600'
          : 'border-slate-200 bg-slate-50 text-slate-700'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${cls}`}
    >
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{count}</span>
    </span>
  )
}
