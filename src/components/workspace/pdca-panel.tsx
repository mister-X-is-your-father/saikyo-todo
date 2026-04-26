'use client'

/**
 * PDCA panel (Phase 5.4) — Dashboard View に組み込む。
 * - 4 状態 (Plan/Do/Check/Act) の件数
 * - Lead time stats (avg / p50 / p95)
 * - Daily throughput (period 内の done 件数推移)
 * - 期間切替: 30 日 / 90 日 (default 30)
 */
import { parseAsInteger, useQueryState } from 'nuqs'

import { usePdcaSummary } from '@/features/pdca/hooks'

import { ErrorState, Loading } from '@/components/shared/async-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  workspaceId: string
}

function isoDaysFromToday(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
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
    <Card data-testid="pdca-panel">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">PDCA ({days} 日間)</CardTitle>
          <div className="flex gap-1" role="group" aria-label="集計期間">
            <Button
              size="sm"
              variant={days === 30 ? 'default' : 'outline'}
              onClick={() => setDays(30)}
              data-testid="pdca-period-30"
              aria-pressed={days === 30}
            >
              30 日
            </Button>
            <Button
              size="sm"
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
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
            <div className="text-muted-foreground text-xs" id="pdca-dist-label">
              分布
            </div>
            <div
              className="flex h-2 w-full overflow-hidden rounded-full"
              role="img"
              aria-labelledby="pdca-dist-label"
              aria-label={(() => {
                const pct = (n: number) => Math.round((n / total) * 100)
                return `分布 (合計 ${total}): Plan ${counts.plan} (${pct(counts.plan)}%) / Do ${counts.do} (${pct(counts.do)}%) / Check ${counts.check} (${pct(counts.check)}%) / Act ${counts.act} (${pct(counts.act)}%)`
              })()}
              data-testid="pdca-distribution-bar"
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
        <div className="grid grid-cols-3 gap-2">
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
        aria-label={`日次完了 throughput (${data.length} 日分)`}
        data-testid="pdca-daily-bars"
      >
        {data.map((d) => {
          const h = Math.round((d.done / max) * 100)
          return (
            <div
              key={d.date}
              role="listitem"
              aria-label={`${d.date}: 完了 ${d.done} 件`}
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
        <span>{data[0]?.date.slice(5)}</span>
        <span>max {max}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  )
}

function LeadStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded border p-2 text-center">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-mono text-lg">
        {value} <span className="text-xs">{unit}</span>
      </div>
    </div>
  )
}
