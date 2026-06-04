/**
 * iter550 (queue PDCA P-5 wire-up): cycle-check-stats を消費する Card 表示 component。
 *
 * PDCA cycle UI (P-1 schema / P-2 CRUD UI / P-3 4-tab phase UI) はまだ未着地だが、
 * iter534 着地の `buildCycleCheckStats` (Check phase 自動集計 substrate) を消費する
 * widget UI substrate を先行投下。P-3 で 4-tab UI (Plan / Do / Check / Act) を組む際、
 * Check tab で本 component を直 import するだけで数値レポートが完結する。
 *
 * 設計目的 (FEEDBACK_QUEUE.md PDCA P-5):
 *   - cycle 紐付き items の lead time / 完了率 / 期日遅延 を deterministic に表示
 *   - AI 文章 (一般論 fluffy) を排除、actual_value 候補は本 component output を直消費
 *
 * 副作用なし、依存は `buildCycleCheckStats` + `DataWidgetCard` + `SeverityChip` のみ。
 */
import { Activity, AlertOctagon, Ban, Lock } from 'lucide-react'

import {
  buildCycleCheckStats,
  type CycleCheckItemFields,
  type CycleCheckOptions,
  cycleCheckSeverity,
} from '@/features/pdca/cycle-check-stats'

import { DataWidgetCard } from '@/components/shared/data-widget-card'
import { SeverityChip } from '@/components/shared/severity-chip'

interface Props {
  items: readonly CycleCheckItemFields[]
  cycleStartedAt?: CycleCheckOptions['cycleStartedAt']
  cycleEndedAt?: CycleCheckOptions['cycleEndedAt']
  className?: string
}

/** iter454 (iter424 pattern 水平展開): 進捗 bar の aria-valuetext に severity 文字 */
function severityLabelJa(sev: 'ok' | 'info' | 'warn' | 'danger'): string {
  if (sev === 'ok') return '順調'
  if (sev === 'info') return '良好'
  if (sev === 'warn') return '注意'
  return '要対策'
}

export function CycleCheckStatsCard({ items, cycleStartedAt, cycleEndedAt, className }: Props) {
  const stats = buildCycleCheckStats(items, { cycleStartedAt, cycleEndedAt })
  // iter531 wire-up: 内部 completionSeverity (rate のみ) を `cycleCheckSeverity(stats)`
  // (iter547 helper、SprintRetro と同 thresholds + total=0 → warn 含む) に集約。
  // total=0 ケースが warn (= empty cycle 注意促す) と判定されるよう統一。
  const sev = cycleCheckSeverity(stats)

  const sevBarCls =
    sev === 'ok'
      ? 'bg-emerald-500'
      : sev === 'info'
        ? 'bg-sky-500'
        : sev === 'warn'
          ? 'bg-amber-500'
          : 'bg-rose-500'

  return (
    <DataWidgetCard
      title="PDCA Check 数値レポート"
      icon={<Activity className="text-primary h-4 w-4" aria-hidden="true" />}
      count={stats.total}
      empty={stats.total === 0}
      emptyTitle="この cycle には item がありません"
      emptyDescription="Do tab で item を紐付けると Check 集計が出ます"
      className={className}
      testId="cycle-check-stats-card"
    >
      <div className="space-y-4 text-sm">
        {/* 完了率 progress bar */}
        <div>
          {/* iter925: 視覚 label "完了率" + 数値 行は下の progressbar aria-label
              "PDCA Cycle 完了率 ${pct}% (${sevLabel})" が完全 content を持つため、
              SR では progressbar 単独経路に集約 (iter912 SprintCard / iter915
              GoalCard / iter924 SprintRetroWidget と同 pattern、4 widget 完全一貫)。 */}
          <div className="mb-1 flex items-center justify-between" aria-hidden="true">
            <span className="text-xs font-medium">完了率</span>
            <span className="text-2xl font-semibold tabular-nums">
              {stats.completionRate}
              <span className="text-muted-foreground ml-0.5 text-sm">%</span>
            </span>
          </div>
          <div
            className="bg-muted h-2 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={stats.completionRate}
            aria-valuemin={0}
            aria-valuemax={100}
            /* iter1503: paren convention `( ${sev} )` を em-dash に統一
               (iter1094 goals + iter1501 副 sprint + iter1502 sprint-retro と同 sweep)。 */
            aria-label={`PDCA Cycle 完了率 ${stats.completionRate}% — ${severityLabelJa(sev)}`}
            aria-valuetext={`${stats.completionRate}% — ${severityLabelJa(sev)}`}
          >
            <div
              className={`h-full ${sevBarCls}`}
              style={{ width: `${stats.completionRate}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* lead time */}
        {stats.leadTimeAvgHours !== null ? (
          // iter1081 basics: role="img" 付与で SR aria-label authoritative 化
          // 28 弾目 (iter1023/1049-1080 sweep 続編、iter1080 sprint-retro dl と同 dl 形態)。
          // dl は definition-list semantic だが 内 dt/dd を aria-hidden で隠して
          // 集約 aria-label を持つ atomic chip pattern。role="img" で 1 unit 化。
          <dl
            className="grid grid-cols-3 gap-2 text-xs"
            role="img"
            /* iter1574: 旧 aria-label paren convention `"Lead time 統計 (...)"` は iter1093-1573
               sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
            aria-label={`Lead time 統計 — 平均 ${stats.leadTimeAvgHours}h / 中央 ${stats.leadTimeMedianHours ?? '不明'}h / 期間 ${stats.cycleDurationDays}d`}
            /* iter1925: 3 cell grid 並列表示は visible で個別読めるが integrated summary は
               表示されず、aria-label の 1 行 summary を sighted hover で disclose
               (sprint-retro 計画vs納品 iter1921 / pdca-leadtime iter1895 と同 chart 透明性 pattern)。 */
            title={`Lead time 統計 — 平均 ${stats.leadTimeAvgHours}h / 中央 ${stats.leadTimeMedianHours ?? '不明'}h / 期間 ${stats.cycleDurationDays}d`}
          >
            <div aria-hidden="true">
              <dt className="text-muted-foreground">平均 lead</dt>
              <dd className="text-base font-semibold tabular-nums">{stats.leadTimeAvgHours}h</dd>
            </div>
            {stats.leadTimeMedianHours !== null ? (
              <div aria-hidden="true">
                <dt className="text-muted-foreground">中央 lead</dt>
                <dd className="text-base font-semibold tabular-nums">
                  {stats.leadTimeMedianHours}h
                </dd>
              </div>
            ) : null}
            <div aria-hidden="true">
              <dt className="text-muted-foreground">期間 (日)</dt>
              <dd className="text-base font-semibold tabular-nums">{stats.cycleDurationDays}d</dd>
            </div>
          </dl>
        ) : null}

        {/* status 分布 — iter1081 basics と同 pattern (role="img") */}
        <dl
          className="grid grid-cols-3 gap-2 text-xs"
          role="img"
          /* iter1574: 旧 aria-label paren convention `"ステータス分布 (...)"` は iter1093-1573
             sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
          aria-label={`ステータス分布 — 完了 ${stats.done} 件 / 未完了 ${stats.inProgressOrTodo} 件 / cancelled ${stats.cancelled} 件`}
        >
          <div aria-hidden="true">
            <dt className="text-muted-foreground">完了</dt>
            <dd className="font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
              {stats.done}
            </dd>
          </div>
          <div aria-hidden="true">
            <dt className="text-muted-foreground">未完了</dt>
            <dd className="font-semibold tabular-nums">{stats.inProgressOrTodo}</dd>
          </div>
          <div aria-hidden="true">
            <dt className="text-muted-foreground">cancelled</dt>
            <dd className="text-muted-foreground font-semibold tabular-nums">{stats.cancelled}</dd>
          </div>
        </dl>

        {/* root cause chips */}
        {(stats.lateCompletionCount > 0 || stats.inFlightOverdueCount > 0) && (
          <div>
            <h3
              id="cycle-check-cause-heading"
              className="text-muted-foreground mb-1 text-xs font-normal"
            >
              遅延 / 期限超過
            </h3>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-labelledby="cycle-check-cause-heading"
            >
              {stats.inFlightOverdueCount > 0 && (
                <SeverityChip
                  severity="danger"
                  icon={<AlertOctagon className="h-3 w-3" aria-hidden="true" />}
                  label="期限超過 active"
                  delta={stats.inFlightOverdueCount}
                  ariaLabel={`期限超過 active ${stats.inFlightOverdueCount} 件`}
                  testId="cycle-cause-overdue"
                />
              )}
              {stats.lateCompletionCount > 0 && (
                <SeverityChip
                  severity="warn"
                  icon={<Lock className="h-3 w-3" aria-hidden="true" />}
                  label="遅延完了"
                  delta={stats.lateCompletionCount}
                  ariaLabel={`遅延完了 ${stats.lateCompletionCount} 件`}
                  testId="cycle-cause-late"
                />
              )}
              {stats.cancelled > 0 && (
                <SeverityChip
                  severity="muted"
                  icon={<Ban className="h-3 w-3" aria-hidden="true" />}
                  label="cancelled"
                  delta={stats.cancelled}
                  ariaLabel={`cancelled ${stats.cancelled} 件`}
                  testId="cycle-cause-cancelled"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </DataWidgetCard>
  )
}
