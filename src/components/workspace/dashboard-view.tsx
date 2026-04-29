'use client'

/**
 * Dashboard View (4th ViewPlugin)。
 * - MUST Item 一覧 (due_date asc)、期限警告色分け (overdue=red / soon=amber)
 * - WIP 警告バナー (wipInProgress > wipLimit)
 * - Burndown chart (recharts LineChart: open 線 + closed 線)
 *
 * 他 View と違い、props で渡される items は使わず、自前の hooks で MUST summary + burndown を fetch。
 * (items board の filter が dashboard には不要、完結して表示したい)
 */
import { useMemo } from 'react'

import { AlertTriangle, Flame } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { shiftIsoDate, todayUtcISO } from '@/lib/date/iso'
import { isAppError } from '@/lib/errors'
import { trendGlyph, trendToneClass } from '@/lib/ui/trend-tone'

import { useBurndown, useMustSummary } from '@/features/dashboard/hooks'
import {
  countAgingItemsOlderThanWeek,
  countItemsByAge,
  formatAgingCounts,
} from '@/features/item/backlog-aging'
import {
  computeCompletionDaysByPriority,
  computePriorityLatencyGap,
  formatCompletionDaysByPriorityJa,
} from '@/features/item/completion-days-by-priority'
import {
  computeDodCoverage,
  dodCoverageTone,
  formatDodCoverageJa,
} from '@/features/item/dod-coverage'
import {
  computeDueDateCoverage,
  dueDateCoverageTone,
  formatDueDateCoverageJa,
} from '@/features/item/due-date-coverage'
import {
  computeDueHitRate,
  computeDueHitRateByPriority,
  countNonEmptyPriorityBuckets,
  dueHitRateTone,
  formatDueHitRateByPriorityJa,
  formatDueHitRateJa,
} from '@/features/item/due-hit-rate'
import { useItems } from '@/features/item/hooks'
import {
  computeWorkspaceMomentum,
  formatWorkspaceMomentumJa,
  momentumDirectionToTrend,
} from '@/features/item/momentum'
import {
  computeMustHygiene,
  formatMustHygieneJa,
  mustHygieneSeverity,
} from '@/features/item/must-hygiene'
import { computeSlipDays, formatSlipDaysJa, slipSeverity } from '@/features/item/slip-days'
import { computeVelocity, formatVelocitySummary } from '@/features/item/velocity'
import {
  computeWipByPriority,
  formatWipByPriorityJa,
  wipBiasKind,
} from '@/features/item/wip-by-priority'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { chipTone3Class, DashboardChip } from '@/components/workspace/dashboard-chip'
import { StatusBadge } from '@/components/workspace/status-badge'

interface Props {
  workspaceId: string
}

function formatDayShort(iso: string): string {
  // 'YYYY-MM-DD' → 'MM/DD'
  return iso.slice(5).replace('-', '/')
}

// iter335 refactor: VELOCITY_TONE / VELOCITY_GLYPH は lib/ui/trend-tone.ts に集約。
// 時間軸と同 polarity='positive' (up=blue 増加 / flat=muted 横ばい / down=red 失速)。
// iter345 refactor: todayISO / addDaysISO (UTC 系) は lib/date/iso.ts に集約。

export function DashboardView({ workspaceId }: Props) {
  const summary = useMustSummary(workspaceId)
  const burndown = useBurndown(workspaceId, 14)
  // Phase 6.15 iter 71: MUST item title click で ItemEditDialog を open
  const [, setOpenItemId] = useQueryState('item', parseAsString)
  // iter331 basics: velocity (iter302) を bind — 直近 7 日 done 件数 + 傾向。
  const itemsQ = useItems(workspaceId)

  const todayStr = todayUtcISO()
  const soonStr = shiftIsoDate(todayStr, 7)

  const burndownData = useMemo(() => {
    return (burndown.data ?? []).map((p) => ({ ...p, label: formatDayShort(p.date) }))
  }, [burndown.data])

  const velocity = useMemo(() => {
    if (!itemsQ.data) return null
    const result = computeVelocity(itemsQ.data, { windowDays: 7 })
    if (result.total === 0) return null
    return { result, line: formatVelocitySummary(result, 7) }
  }, [itemsQ.data])

  // iter336 basics: completion-days-by-priority (iter334) を bind。
  // 全期間完了済 item の所要日数 priority 別 + 高優先 vs 低優先 gap chip。
  // since filter は割愛 (Date.now() useMemo 内呼出を避ける、全 history で平均が取れる方が
  // 統計的にも安定)。Item 完了履歴は archive されないので過去全件が対象。
  const completionGap = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeCompletionDaysByPriority(itemsQ.data)
    const summary = formatCompletionDaysByPriorityJa(stats)
    if (summary === '完了 0 件 (該当なし)') return null
    const gap = computePriorityLatencyGap(stats)
    return { stats, summary, gap }
  }, [itemsQ.data])

  // iter341 basics: workspace momentum (iter339) を bind。直近 7 日 intake vs done
  // を 4 値分類で chip 表示。direction='idle' (= 7 日完全に活動なし) は chip 非表示。
  const momentum = useMemo(() => {
    if (!itemsQ.data) return null
    const m = computeWorkspaceMomentum(itemsQ.data, { windowDays: 7 })
    if (m.direction === 'idle') return null
    const line = formatWorkspaceMomentumJa(m)
    return { result: m, line, trend: momentumDirectionToTrend(m.direction) }
  }, [itemsQ.data])

  // iter343 basics: due-hit-rate (iter342) を bind。完了 + dueDate 有効 item の
  // 期限達成率を chip 表示。total=0 (= 期限付き完了 item 無し) は chip 非表示で UI 静か。
  // hitRate >= 0.8 は emerald (達成)、0.5..0.8 は muted (中立)、<0.5 は amber (警戒)
  // で 3 段階 tone (達成率は higher better なので「up=achievement」polarity='positive')。
  // iter346 basics: priority 別 breakdown (iter344) を aria-label / title に同梱
  // → SR / hover で「P1 100% (3/3) / P3 50% (1/2)」が読める (visible chip 自体は
  // 全体集計だけ、UI は静かなまま、richer info は a11y / hover 経路でのみ提供)。
  const dueHitRate = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeDueHitRate(itemsQ.data)
    if (stats.total === 0 || stats.hitRate === null) return null
    const summary = formatDueHitRateJa(stats)
    const pct = Math.round(stats.hitRate * 100)
    const tone = dueHitRateTone(stats)
    const byPriority = computeDueHitRateByPriority(itemsQ.data)
    // priority breakdown は「複数 priority に hit/miss が分散」時のみ tooltip に
    // 出す。単一 priority に偏ると全体 summary と同情報なので冗長。
    const detail =
      countNonEmptyPriorityBuckets(byPriority) > 1
        ? `${summary} — ${formatDueHitRateByPriorityJa(byPriority)}`
        : summary
    return { stats, summary, pct, tone, detail }
  }, [itemsQ.data])

  // iter348 basics: slip-days (iter347) を bind。期限超過 item の遅延日数 stat を
  // chip 表示。count=0 (= 全完了 hit) で chip 非表示で UI 静か。amber tone で
  // 警戒色 (= 「遅延 = bad」)、最大値が 7 日以上は red 強調 (= 「重度遅延」)。
  const slipDays = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeSlipDays(itemsQ.data)
    if (stats.count === 0) return null
    const summary = formatSlipDaysJa(stats)
    const severe = slipSeverity(stats) === 'severe'
    return { stats, summary, severe }
  }, [itemsQ.data])

  // iter351 basics: due-date-coverage (iter349) を bind。未完了 item の期限
  // 設定率を chip 表示。total=0 (= 未完了 0 件) で chip 非表示。tone は 3 段階
  // (>= 0.7 emerald 健全 / 0.3..0.7 muted 中立 / < 0.3 amber planning 漏れ)。
  const dueCoverage = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeDueDateCoverage(itemsQ.data)
    if (stats.total === 0 || stats.coverageRate === null) return null
    const summary = formatDueDateCoverageJa(stats)
    const tone = dueDateCoverageTone(stats)
    const pct = Math.round(stats.coverageRate * 100)
    return { stats, summary, tone, pct }
  }, [itemsQ.data])

  // iter353 basics: dod-coverage (iter352) を bind。未完了 item の DoD 設定率を
  // chip 表示。total=0 で chip 非表示。due-date-coverage chip と並列の「planning
  // hygiene 二軸」(期限 + DoD = 計画化 + 受入条件)。
  const dodCoverage = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeDodCoverage(itemsQ.data)
    if (stats.total === 0 || stats.coverageRate === null) return null
    const summary = formatDodCoverageJa(stats)
    const tone = dodCoverageTone(stats)
    const pct = Math.round(stats.coverageRate * 100)
    return { stats, summary, tone, pct }
  }, [itemsQ.data])

  // iter356 basics: wip-by-priority (iter354) を bind。in_progress item の priority
  // 分布で「高優先が止まっているか」を chip 表示。total=0 で chip 非表示。bias kind
  // 別 tone (low-priority-only=amber 警戒 / has-high-priority=emerald 健全)。
  const wipBias = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeWipByPriority(itemsQ.data)
    if (stats.total === 0) return null
    const bias = wipBiasKind(stats)
    if (bias === 'idle') return null
    const summary = formatWipByPriorityJa(stats)
    return { stats, summary, bias }
  }, [itemsQ.data])

  // iter358 basics: must-hygiene (iter357) を bind。MUST item の dueDate 設定状況
  // を chip 表示。total=0 / severity='idle' で chip 非表示。severity 4 値で配色:
  // severe (= 半数以上 期限なし) = red、mild = amber、clean = emerald (= 全て期限付)、
  // idle = hidden (MUST 自体無し)。must-risk (期限近接) と相補。
  const mustHygiene = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeMustHygiene(itemsQ.data)
    const sev = mustHygieneSeverity(stats)
    if (sev === 'idle') return null
    const summary = formatMustHygieneJa(stats)
    return { stats, summary, severity: sev }
  }, [itemsQ.data])

  // iter338 basics: backlog-aging (iter337) を bind。Active (= 未完了 + 未 archive)
  // item を createdAt 年齢バケット別に件数集計、停滞気味 (7 日以上) を tone で警戒。
  const aging = useMemo(() => {
    if (!itemsQ.data) return null
    const active = itemsQ.data.filter((it) => !it.doneAt && !it.archivedAt)
    if (active.length === 0) return null
    const counts = countItemsByAge(active)
    const summary = formatAgingCounts(counts)
    if (summary === '0 件') return null
    const olderThanWeek = countAgingItemsOlderThanWeek(counts)
    return { counts, summary, olderThanWeek }
  }, [itemsQ.data])

  if (summary.isLoading) return <Loading message="ダッシュボード読込中..." />
  if (summary.error) {
    return (
      <ErrorState
        message={isAppError(summary.error) ? summary.error.message : '取得に失敗しました'}
        onRetry={() => void summary.refetch()}
      />
    )
  }
  if (!summary.data) return null

  const s = summary.data

  return (
    <div className="space-y-6" data-testid="dashboard-view">
      {/* サマリ stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="MUST 件数" value={s.items.length} tone="default" />
        <StatCard
          label="進行中 / WIP 上限"
          value={`${s.wipInProgress}/${s.wipLimit}`}
          tone={s.wipExceeded ? 'danger' : 'default'}
        />
        <StatCard
          label="期限超過"
          value={s.overdueCount}
          tone={s.overdueCount > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="7日以内"
          value={s.dueSoonCount}
          tone={s.dueSoonCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* iter331 / iter336 basics: trend / hygiene chips (flex-wrap で同列)
       * iter355 refactor: 8 chip の JSX 重複を <DashboardChip> に集約 */}
      <div className="flex flex-wrap items-center gap-2">
        {velocity ? (
          <DashboardChip
            testId="dashboard-velocity-chip"
            toneClass={trendToneClass(velocity.result.trend, 'positive')}
            glyph={trendGlyph(velocity.result.trend)}
            ariaLabel={velocity.line}
            title={velocity.line}
            text={velocity.line}
            dataAttrs={{ 'data-trend': velocity.result.trend }}
          />
        ) : null}
        {momentum ? (
          <DashboardChip
            testId="dashboard-momentum-chip"
            toneClass={trendToneClass(momentum.trend, 'negative')}
            glyph={trendGlyph(momentum.trend)}
            ariaLabel={momentum.line}
            title={momentum.line}
            text={momentum.line}
            dataAttrs={{ 'data-direction': momentum.result.direction }}
          />
        ) : null}
        {dueCoverage ? (
          <DashboardChip
            testId="dashboard-due-coverage-chip"
            toneClass={chipTone3Class(dueCoverage.tone)}
            glyph="📅"
            ariaLabel={dueCoverage.summary}
            title={dueCoverage.summary}
            text={dueCoverage.summary}
            dataAttrs={{ 'data-coverage-pct': dueCoverage.pct }}
          />
        ) : null}
        {dodCoverage ? (
          <DashboardChip
            testId="dashboard-dod-coverage-chip"
            toneClass={chipTone3Class(dodCoverage.tone)}
            glyph="✓"
            ariaLabel={dodCoverage.summary}
            title={dodCoverage.summary}
            text={dodCoverage.summary}
            dataAttrs={{ 'data-coverage-pct': dodCoverage.pct }}
          />
        ) : null}
        {mustHygiene ? (
          <DashboardChip
            testId="dashboard-must-hygiene-chip"
            toneClass={
              mustHygiene.severity === 'severe'
                ? 'border-red-200 bg-red-50 text-red-700'
                : mustHygiene.severity === 'mild'
                  ? chipTone3Class('warn')
                  : chipTone3Class('good')
            }
            glyph="🔥"
            ariaLabel={mustHygiene.summary}
            title={mustHygiene.summary}
            text={mustHygiene.summary}
            dataAttrs={{
              'data-severity': mustHygiene.severity,
              'data-without-due': mustHygiene.stats.withoutDueDate,
            }}
          />
        ) : null}
        {wipBias ? (
          <DashboardChip
            testId="dashboard-wip-bias-chip"
            toneClass={
              wipBias.bias === 'low-priority-only' ? chipTone3Class('warn') : chipTone3Class('good')
            }
            glyph="▶"
            ariaLabel={
              wipBias.bias === 'low-priority-only'
                ? `${wipBias.summary} — 高優先 0、低優先タスクのみ進行中 (bias 検出)`
                : wipBias.summary
            }
            title={wipBias.summary}
            text={wipBias.summary}
            dataAttrs={{ 'data-bias': wipBias.bias, 'data-wip-total': wipBias.stats.total }}
          />
        ) : null}
        {aging ? (
          <DashboardChip
            testId="dashboard-backlog-aging-chip"
            toneClass={
              aging.olderThanWeek > 0 ? trendToneClass('up', 'negative') : chipTone3Class('neutral')
            }
            glyph="⌛"
            ariaLabel={`Backlog 年齢: ${aging.summary}${aging.olderThanWeek > 0 ? ` — 7 日以上 ${aging.olderThanWeek} 件 (棚卸し対象)` : ''}`}
            title={aging.summary}
            text={
              <>
                Backlog: {aging.summary}
                {aging.olderThanWeek > 0 ? ` — 7日+ ${aging.olderThanWeek}件` : ''}
              </>
            }
            truncateText
            dataAttrs={{ 'data-older-than-week': aging.olderThanWeek }}
          />
        ) : null}
        {dueHitRate ? (
          <DashboardChip
            testId="dashboard-due-hit-rate-chip"
            toneClass={chipTone3Class(dueHitRate.tone)}
            glyph="◎"
            ariaLabel={dueHitRate.detail}
            title={dueHitRate.detail}
            text={dueHitRate.summary}
            dataAttrs={{ 'data-hit-rate': dueHitRate.pct }}
          />
        ) : null}
        {slipDays ? (
          <DashboardChip
            testId="dashboard-slip-days-chip"
            toneClass={
              slipDays.severe
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }
            glyph="⏰"
            ariaLabel={slipDays.summary}
            title={slipDays.summary}
            text={slipDays.summary}
            dataAttrs={{
              'data-severe': slipDays.severe ? 'true' : 'false',
              'data-max-days': slipDays.stats.maxDays ?? 0,
            }}
          />
        ) : null}
        {completionGap ? (
          <DashboardChip
            testId="dashboard-completion-gap-chip"
            toneClass={chipTone3Class('neutral')}
            glyph="⏱"
            ariaLabel={
              completionGap.gap
                ? `${completionGap.summary} — gap ${completionGap.gap.gapDays}日 (P${completionGap.gap.lowKey} が P${completionGap.gap.highKey} より遅い)`
                : completionGap.summary
            }
            title={completionGap.summary}
            text={
              completionGap.gap
                ? `完了所要 P${completionGap.gap.highKey} ${completionGap.gap.highDays}日 / P${completionGap.gap.lowKey} ${completionGap.gap.lowDays}日 (gap ${completionGap.gap.gapDays}日)`
                : completionGap.summary
            }
            truncateText
            dataAttrs={{ 'data-gap-days': completionGap.gap?.gapDays ?? '' }}
          />
        ) : null}
      </div>

      {/* WIP 警告 */}
      {s.wipExceeded ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
          data-testid="wip-warning"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-semibold">WIP 上限超過</div>
            <div className="text-xs">
              進行中の MUST が {s.wipInProgress} 件 (上限 {s.wipLimit}{' '}
              件)。新規着手前に完了を優先してください。
            </div>
          </div>
        </div>
      ) : null}

      {/* Burndown */}
      <Card role="region" aria-label="MUST Item の バーンダウン グラフ (直近 14 日)">
        <CardHeader>
          <CardTitle className="text-base">バーンダウン (14 日)</CardTitle>
        </CardHeader>
        <CardContent>
          {burndown.isLoading ? (
            <Loading message="グラフ読込中..." />
          ) : burndown.error ? (
            <ErrorState
              message={isAppError(burndown.error) ? burndown.error.message : '取得失敗'}
              onRetry={() => void burndown.refetch()}
            />
          ) : (
            // ResponsiveContainer は親が幅 0 / display:none だと
            //   "The width(-1) and height(-1) of chart should be greater than 0"
            // を出す。Phase 6.15 iter 72: height は固定数値 (256px) で渡し、
            // ResponsiveContainer 自身の minHeight=0 / minWidth=0 はやめて
            // width だけ親の 100% に追従させる ("100%"+0 minHeight が逆に
            // 0-px の race を許してしまっていたため)。
            <div className="w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={burndownData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="open"
                    name="未完了"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="closed"
                    name="完了"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/*
       * Phase 6.15 iter104: 「AI 月次コスト上限 + 当月利用状況」と
       * 「AI コスト (直近 3 ヶ月)」テーブルを削除。
       * Claude Max OAuth (claude CLI) 前提なので API 課金は発生せず、コスト集計の意味がない。
       * 残された Researcher / PM 実行履歴の表示は POST_MVP の "監査ログ UI" にまとめる。
       */}

      {/* MUST 一覧 */}
      <Card role="region" aria-label={`MUST Item 一覧 ${s.items.length} 件`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-red-500" aria-hidden="true" />
            MUST Item 一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {s.items.length === 0 ? (
            <EmptyState
              title="MUST Item がありません"
              description="絶対に落とせないタスクに MUST を立ててください"
            />
          ) : (
            <ul className="divide-y text-sm">
              {s.items.map((item) => {
                const overdue = item.dueDate && item.dueDate < todayStr && !item.doneAt
                const soon =
                  !overdue &&
                  item.dueDate &&
                  item.dueDate >= todayStr &&
                  item.dueDate <= soonStr &&
                  !item.doneAt
                return (
                  <li
                    key={item.id}
                    onClick={() => void setOpenItemId(item.id)}
                    className="hover:bg-muted/50 grid cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded py-2"
                    data-testid="must-item-row"
                  >
                    <div className="flex min-w-0 flex-col">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void setOpenItemId(item.id)
                        }}
                        className="hover:text-primary truncate text-left font-medium hover:underline"
                        data-testid={`dashboard-must-title-${item.id}`}
                      >
                        {item.title}
                      </button>
                      {item.dod ? (
                        <span className="text-muted-foreground truncate text-xs">
                          DoD: {item.dod}
                        </span>
                      ) : null}
                    </div>
                    <StatusBadge status={item.status} />
                    <span
                      className={
                        overdue
                          ? 'text-xs font-semibold text-red-600'
                          : soon
                            ? 'text-xs font-semibold text-amber-600'
                            : 'text-muted-foreground text-xs'
                      }
                    >
                      {item.dueDate ?? '期限なし'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {item.doneAt ? '完了' : overdue ? '期限超過' : soon ? '期日近' : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: 'default' | 'warning' | 'danger'
}) {
  const toneCls =
    tone === 'danger'
      ? 'border-red-500/50 bg-red-500/5'
      : tone === 'warning'
        ? 'border-amber-500/50 bg-amber-500/5'
        : ''
  // tone は視覚 (border 色) だけで示しており SR に伝わらないため、
  // aria-label に状態語を含める (Phase 6.15 iter 80)
  const toneText = tone === 'danger' ? '要対応' : tone === 'warning' ? '注意' : ''
  const ariaLabel = toneText ? `${label}: ${value} (${toneText})` : `${label}: ${value}`
  return (
    <div
      className={`rounded-lg border p-4 ${toneCls}`}
      role="group"
      aria-label={ariaLabel}
      data-testid={`stat-card-${tone}`}
    >
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
