'use client'

/**
 * PDCA panel (Phase 5.4) — Dashboard View に組み込む。
 * - 4 状態 (Plan/Do/Check/Act) の件数
 * - Lead time stats (avg / p50 / p95)
 * - Daily throughput (period 内の done 件数推移)
 * - 期間切替: 30 日 / 90 日 (default 30)
 */
import { parseAsInteger, useQueryState } from 'nuqs'

import { shiftIsoDate, todayUtcISO } from '@/lib/date/iso'
import { rateToPct } from '@/lib/format-rate'

import { usePdcaSummary } from '@/features/pdca/hooks'

import { ErrorState, Loading } from '@/components/shared/async-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  workspaceId: string
}

// iter345 refactor: isoDaysFromToday の inline 定義は lib/date/iso.ts に集約。
function isoDaysFromToday(days: number): string {
  return shiftIsoDate(todayUtcISO(), days)
}

const PDCA_COLORS = {
  plan: '#94a3b8', // slate-400
  do: '#3b82f6', // blue-500
  check: '#10b981', // emerald-500
  act: '#f59e0b', // amber-500
} as const

export function PdcaPanel({ workspaceId }: Props) {
  // Phase 6.15 iter 76: PDCA period (30/90) を URL に永続化 (Gantt iter74-75 と同パターン)
  const [daysRaw, setDays] = useQueryState('pdcaDays', parseAsInteger.withDefault(30))
  const days: 30 | 90 = daysRaw === 90 ? 90 : 30
  const from = isoDaysFromToday(-(days - 1))
  const to = isoDaysFromToday(0)
  const summary = usePdcaSummary(workspaceId, { from, to })

  if (summary.isLoading) return <Loading />
  if (summary.error)
    return <ErrorState message={(summary.error as Error).message ?? '読み込み失敗'} />
  if (!summary.data) return null

  const { counts, leadTimeDays, daily } = summary.data
  const total = counts.plan + counts.do + counts.check + counts.act

  return (
    <Card data-testid="pdca-panel" role="region" aria-labelledby="pdca-panel-heading">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle id="pdca-panel-heading" className="text-base" role="heading" aria-level={2}>
            PDCA ({days} 日間)
          </CardTitle>
          <div
            className="flex gap-1"
            role="group"
            /* iter1582: 旧 aria-label paren convention `"集計期間 (現在: X 日、30 / 90 から選択)"` は
               iter1093-1581 sweep の em-dash 区切と divergent。区切のみ '(現在:' → ' — 現在' に統一、closing ')' は削除。 */
            aria-label={`集計期間 — 現在 ${days} 日、30 / 90 から選択`}
          >
            <Button
              size="sm"
              className="min-h-11"
              variant={days === 30 ? 'default' : 'outline'}
              onClick={() => setDays(30)}
              data-testid="pdca-period-30"
              aria-pressed={days === 30}
            >
              30 日
            </Button>
            <Button
              size="sm"
              className="min-h-11"
              variant={days === 90 ? 'default' : 'outline'}
              onClick={() => setDays(90)}
              data-testid="pdca-period-90"
              aria-pressed={days === 90}
            >
              90 日
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PDCA 件数: 4 列 */}
        <div
          className="grid grid-cols-2 gap-2 md:grid-cols-4"
          role="group"
          /* iter1577: 旧 aria-label paren convention `"PDCA 4 段階の集計 (...)"` は iter1093-1576
             sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
          aria-label={`PDCA 4 段階の集計 — Plan ${counts.plan} / Do ${counts.do} / Check ${counts.check} / Act ${counts.act} 件`}
        >
          <PdcaStat label="Plan" sub="未着手" value={counts.plan} color={PDCA_COLORS.plan} />
          <PdcaStat label="Do" sub="進行中" value={counts.do} color={PDCA_COLORS.do} />
          <PdcaStat
            label="Check"
            sub="直近 7 日完了"
            value={counts.check}
            color={PDCA_COLORS.check}
          />
          <PdcaStat label="Act" sub="完了 (cycle 済)" value={counts.act} color={PDCA_COLORS.act} />
        </div>

        {/* PDCA 比率バー (1 行) */}
        {total > 0 && (
          <div className="space-y-1">
            {/* iter914: 視覚 label "分布" は下の role="img" bar の aria-label
                "分布 (合計 N): Plan X (Y%) / ..." が完全 content を持つため、
                SR では bar 1 経路に集約 (iter907/909-912 続編)。orphaned id 除去。 */}
            <div className="text-muted-foreground text-xs" aria-hidden="true">
              分布
            </div>
            <div
              className="flex h-2 w-full overflow-hidden rounded-full"
              role="img"
              aria-label={(() => {
                const pct = (n: number) => rateToPct(n / total)
                return `分布 (合計 ${total}): Plan ${counts.plan} (${pct(counts.plan)}%) / Do ${counts.do} (${pct(counts.do)}%) / Check ${counts.check} (${pct(counts.check)}%) / Act ${counts.act} (${pct(counts.act)}%)`
              })()}
              data-testid="pdca-distribution-bar"
              /* iter1891: visible は 4 色 bar segment のみで合計や個別 % が hover で見えず、
                 sighted hover で full distribution disclose (quick-add-calibrated iter1889 続編)。 */
              title={(() => {
                const pct = (n: number) => rateToPct(n / total)
                return `分布 (合計 ${total}): Plan ${counts.plan} (${pct(counts.plan)}%) / Do ${counts.do} (${pct(counts.do)}%) / Check ${counts.check} (${pct(counts.check)}%) / Act ${counts.act} (${pct(counts.act)}%)`
              })()}
            >
              <div
                className="h-full"
                style={{
                  width: `${(counts.plan / total) * 100}%`,
                  background: PDCA_COLORS.plan,
                }}
                title={`Plan ${counts.plan}`}
                aria-hidden
              />
              <div
                className="h-full"
                style={{
                  width: `${(counts.do / total) * 100}%`,
                  background: PDCA_COLORS.do,
                }}
                title={`Do ${counts.do}`}
                aria-hidden
              />
              <div
                className="h-full"
                style={{
                  width: `${(counts.check / total) * 100}%`,
                  background: PDCA_COLORS.check,
                }}
                title={`Check ${counts.check}`}
                aria-hidden
              />
              <div
                className="h-full"
                style={{
                  width: `${(counts.act / total) * 100}%`,
                  background: PDCA_COLORS.act,
                }}
                title={`Act ${counts.act}`}
                aria-hidden
              />
            </div>
          </div>
        )}

        {/* Lead time stats */}
        {/* iter1621: 3 LeadStat (平均 / 中央値 / P95) は dt/dd 構造を持たない単純 div で SR が
           "平均", "0", "日", "中央値", "0", "日", ... と 9 piece に分解し読み上げる UX gap。
           cycle-check-stats-card (iter1081 + iter1574 sweep) と同 atomic chip pattern で
           grid 親に role="img" + 集約 aria-label を付与、内側 LeadStat は aria-hidden で
           重複読み上げを抑止し SR が 1 unit として解釈するように。 */}
        <div
          className="grid grid-cols-3 gap-2"
          role="img"
          aria-label={`Lead time 内訳 — 平均 ${leadTimeDays.avg} 日 / 中央値 ${leadTimeDays.p50} 日 / P95 ${leadTimeDays.p95} 日`}
        >
          <LeadStat label="平均" value={leadTimeDays.avg} unit="日" />
          <LeadStat label="中央値" value={leadTimeDays.p50} unit="日" />
          <LeadStat label="P95" value={leadTimeDays.p95} unit="日" />
        </div>
        <p className="text-muted-foreground text-xs">
          Lead time = createdAt → doneAt の日数 ({leadTimeDays.n} 件で集計)
        </p>

        {/* Daily throughput sparkline (CSS bar) — recharts は dev compile が重く navigation を
            block しがちなので非依存の simple 棒グラフで実装 (Phase 5.4) */}
        {daily.length > 0 && (
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">日次完了 (throughput)</div>
            <DailyBars data={daily} color={PDCA_COLORS.check} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PdcaStat({
  label,
  sub,
  value,
  color,
}: {
  label: string
  sub: string
  value: number
  color: string
}) {
  return (
    <div className="rounded border p-2">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-1 font-mono text-2xl">{value}</div>
      <div className="text-muted-foreground text-[10px]">{sub}</div>
    </div>
  )
}

function DailyBars({
  data,
  color,
}: {
  data: Array<{ date: string; done: number }>
  color: string
}) {
  const max = Math.max(1, ...data.map((d) => d.done))
  // Phase 6.15 iter 90: SR 用に list semantics と aria-label を付与 (元は title のみで mouse hover 専用)
  return (
    <div className="space-y-1">
      <div
        className="flex h-[100px] items-end gap-px overflow-hidden rounded border p-1"
        role="list"
        /* iter1584: 旧 aria-label paren convention `"日次完了 throughput (X 日分)"` は iter1093-1583
           sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
        aria-label={`日次完了 throughput — ${data.length} 日分`}
        data-testid="pdca-daily-bars"
      >
        {data.map((d) => {
          const h = rateToPct(d.done / max)
          return (
            <div
              key={d.date}
              role="listitem"
              /* iter1568: 旧 aria-label `"${d.date}: 完了 ${d.done} 件"` は ':' colon 区切で
                 iter1093-1567 sweep の em-dash convention と divergent。visible prefix
                 ${d.date} は維持 (voice control)、区切のみ em-dash 化。 */
              aria-label={`${d.date} — 完了 ${d.done} 件`}
              className="flex flex-1 flex-col items-center justify-end"
              title={`${d.date}: ${d.done} 件`}
            >
              <div
                className="w-full rounded-sm"
                style={{ height: `${h}%`, background: d.done === 0 ? '#e5e7eb' : color }}
              />
            </div>
          )
        })}
      </div>
      <div className="text-muted-foreground flex justify-between text-[10px]">
        {(() => {
          const first = data[0]?.date
          return first ? <time dateTime={first}>{first.slice(5)}</time> : <span />
        })()}
        <span>max {max}</span>
        {(() => {
          const last = data[data.length - 1]?.date
          return last ? <time dateTime={last}>{last.slice(5)}</time> : <span />
        })()}
      </div>
    </div>
  )
}

function LeadStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  // iter1621: aria-hidden で親 grid (role=img) の集約 aria-label を authoritative 化
  // (cycle-check-stats-card iter1081 pattern と統一)。
  return (
    <div className="rounded border p-2 text-center" aria-hidden="true">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-mono text-lg">
        {value} <span className="text-xs">{unit}</span>
      </div>
    </div>
  )
}
