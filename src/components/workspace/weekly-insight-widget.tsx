'use client'

/**
 * iter480 (queue fluffy-8 weekly→widget UI bind): Weekly Insight widget UI binding。
 *
 * fluffy 撲滅原則 (FEEDBACK_QUEUE.md META):
 *   - AI 文章生成 (週次振り返り) を置き換える deterministic widget
 *   - pure helper `buildWeeklyInsight` (iter531 で着地) を呼ぶだけ、副作用なし
 *
 * 表示内容 (見て即わかる):
 *   - 今週合計 done 件数 + 前週比 % (緑↑ / 赤↓ / 灰横ばい)
 *   - 7 日 × 2 (current / prev) の mini bar chart (CSS 内製、recharts 不要)
 *   - anomaly 1-2 行 (lowCompletionDay / overdueSpike) があれば赤帯で警告
 *
 * 6 軸スコア:
 *   - 軸 1 圧倒的可視化: 今週 vs 前週 を 1 画面 7 mini bar で見せる ★
 *   - 軸 4 作業漏れ防止: overdueSpike anomaly を能動表示 ★
 *   - 軸 5 やる気: weekDelta が正なら緑 ↑ で gain feeling
 */
import { useMemo } from 'react'

import { AlertTriangle, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'

import { trendToneClass } from '@/lib/ui/trend-tone'
import { buildFourStateHintChip } from '@/lib/widget/severity-bridges'

import {
  buildWeeklyInsight,
  classifyWeeklyInsightHint,
  formatBestDayJa,
  formatWeeklyInsightHintJa,
  formatWorstDayJa,
  pickBestDayInWeek,
  pickWorstDayInWeek,
  type WeeklyInsightItemFields,
} from '@/features/dashboard/weekly-insight'
import type { Item } from '@/features/item/schema'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  items: Item[]
  /** 省略時は new Date()。test 時に injection 用 */
  now?: Date
}

/**
 * 「Weekly Insight」widget (Dashboard 配置)。
 *
 * AI 不使用 — buildWeeklyInsight (純 algorithm) の output を直接 render。
 */
export function WeeklyInsightWidget({ items, now }: Props) {
  const insightInput = useMemo<WeeklyInsightItemFields[]>(
    () =>
      items.map((it) => ({
        doneAt: it.doneAt ?? null,
        status: it.status ?? null,
        dueDate: it.dueDate ?? null,
        // tagIds は item.list で join されないので空配列 (= __notag に集約)
        tagIds: [],
      })),
    [items],
  )
  const insight = useMemo(() => buildWeeklyInsight(insightInput, now), [insightInput, now])

  // 何も活動がなければ widget 非表示 (noise 削減)
  if (insight.currentWeekTotal === 0 && insight.prevWeekTotal === 0) return null

  const peak = Math.max(
    1, // 0 除算回避 + 0 件 day も最低 1px は確保
    ...insight.byDay.flatMap((d) => [d.current, d.prev]),
  )

  const deltaTone =
    insight.weekDelta.count > 0
      ? trendToneClass('up', 'positive')
      : insight.weekDelta.count < 0
        ? trendToneClass('down', 'positive')
        : trendToneClass('flat', 'positive')

  const deltaIcon =
    insight.weekDelta.count > 0 ? (
      <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
    ) : insight.weekDelta.count < 0 ? (
      <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
    ) : null

  const deltaLabel =
    insight.weekDelta.percent === null
      ? `今週 ${insight.currentWeekTotal} 件 (前週 0 件、比較不可)`
      : `今週 ${insight.currentWeekTotal} 件 / 前週 ${insight.prevWeekTotal} 件 (${
          insight.weekDelta.count >= 0 ? '+' : ''
        }${insight.weekDelta.count} 件、${insight.weekDelta.percent >= 0 ? '+' : ''}${
          insight.weekDelta.percent
        }%)`

  // iter481 basics: 今週 ベスト曜日 chip — 軸 5 やる気 (ハイライト「うまくいった日」)
  const bestDay = pickBestDayInWeek(insight)
  const bestDayLabel = formatBestDayJa(bestDay)
  // iter509 ai-automation: 今週 worst 曜日 chip — 軸 4 漏れ防止 (サボった日 highlight)。
  // best と並列表示、0 件なら amber、1+ なら slate (= 軽い注意)
  const worstDay = pickWorstDayInWeek(insight)
  // iter505 simplification: 4 行 chip 構築 → buildFourStateHintChip で 1 行化
  const hint = buildFourStateHintChip(insight, classifyWeeklyInsightHint, formatWeeklyInsightHintJa)

  // iter511 basics: aria-label に worstDay 情報も含めて SR で完全な状態を読める
  const worstDayAriaPart =
    worstDay !== null && worstDay.dayIndex !== bestDay?.dayIndex
      ? `。${formatWorstDayJa(worstDay)}`
      : ''

  return (
    <Card
      role="region"
      aria-label={`週次 Insight (${hint.label}): ${deltaLabel}。${bestDayLabel}${worstDayAriaPart}`}
      data-weekly-insight-hint={hint.label}
      data-testid="weekly-insight-widget"
    >
      <CardHeader className="pb-2">
        <CardTitle
          className="flex flex-wrap items-center gap-2 text-base"
          role="heading"
          aria-level={2}
        >
          週次 Insight
          <span className="text-muted-foreground text-xs font-normal">{insight.weekStart} 週</span>
          <span
            className={`ml-auto rounded border px-2 py-0.5 text-[11px] font-medium ${hint.chipClass}`}
            data-testid="weekly-insight-hint"
            data-severity={hint.severity}
            aria-hidden="true"
          >
            {hint.label}
          </span>
          {bestDay !== null && (
            <span
              // iter1519: best-day chip + worst-day chip 2 件は light 固定で iter1376/1493/
              // 1512-1518 dark chip pattern からこぼれていた。dark variant 補完。
              className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              data-testid="weekly-insight-best-day"
              aria-hidden="true"
            >
              ⭐ {bestDayLabel}
            </span>
          )}
          {worstDay !== null && worstDay.dayIndex !== bestDay?.dayIndex && (
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                worstDay.current === 0
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                  : 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
              }`}
              data-testid="weekly-insight-worst-day"
              data-worst-current={worstDay.current}
              aria-hidden="true"
            >
              {worstDay.current === 0 ? '😴' : '⚠'} {formatWorstDayJa(worstDay)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-baseline gap-3">
          <div className="text-2xl font-semibold tabular-nums">{insight.currentWeekTotal}</div>
          <div className="text-muted-foreground text-xs">完了 / 今週</div>
          <div
            className={`ml-auto flex items-center gap-1 text-xs font-medium ${deltaTone}`}
            data-testid="weekly-insight-delta"
          >
            {deltaIcon}
            <span className="tabular-nums">
              {insight.weekDelta.count >= 0 ? '+' : ''}
              {insight.weekDelta.count}
            </span>
            {insight.weekDelta.percent !== null && (
              <span className="tabular-nums opacity-80">
                ({insight.weekDelta.percent >= 0 ? '+' : ''}
                {insight.weekDelta.percent}%)
              </span>
            )}
            {/* iter1382: text-foreground/80 (theme-aware) は delta chip の light 固定 tone
                bg (bg-blue-50/red-50) 上で dark 時に明色化し white-on-light 1.03 になる
                (WCAG 1.4.3)。chip 自身の tone text 色を継承させ両モードで pass。 */}
            <span className="ml-1">vs 前週</span>
          </div>
        </div>

        <div
          className="grid grid-cols-7 gap-1"
          role="img"
          /* iter1595: paren + colon convention を iter1093-1594 sweep の em-dash 区切に統一。 */
          aria-label={`曜日別完了件数 — 今週 vs 前週 — ${insight.byDay
            .map((d) => `${d.day} 今週${d.current} / 前週${d.prev}`)
            .join(', ')}`}
          data-testid="weekly-insight-by-day"
        >
          {insight.byDay.map((d) => {
            const currHeight = (d.current / peak) * 100
            const prevHeight = (d.prev / peak) * 100
            return (
              <div key={d.dayIndex} className="flex flex-col items-center gap-0.5">
                <div
                  className="bg-muted/40 relative flex h-12 w-full items-end gap-0.5 rounded px-0.5"
                  data-testid={`weekly-insight-bar-${d.day}`}
                >
                  <div
                    className="bg-primary/80 w-1/2 rounded-sm"
                    style={{ height: `${currHeight}%` }}
                    title={`今週 ${d.day}: ${d.current}`}
                  />
                  <div
                    className="bg-muted-foreground/40 w-1/2 rounded-sm"
                    style={{ height: `${prevHeight}%` }}
                    title={`前週 ${d.day}: ${d.prev}`}
                  />
                </div>
                <div className="text-muted-foreground text-[10px]">{d.day}</div>
              </div>
            )
          })}
        </div>

        {insight.anomalies.length > 0 && (
          <ul
            className="space-y-1"
            /* iter1588: paren convention を em-dash 区切に統一 (iter1093-1587 sweep)。 */
            aria-label={`今週の特筆事項 ${insight.anomalies.length} 件 — 集中日 / 過小日 / 期限超過 spike`}
            data-testid="weekly-insight-anomalies"
          >
            {insight.anomalies.map((a) => {
              // iter504 ai-automation: highCompletionDay は positive anomaly (= 集中日)
              // で emerald 配色、その他 (lowCompletionDay / overdueSpike) は amber 配色。
              const isPositive = a.kind === 'highCompletionDay'
              // iter1526: anomaly chip 2 tone (emerald positive / amber negative) は
              // light 固定で iter1376/1493/1512-1525 chip dark sweep からこぼれていた。
              const tone = isPositive
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
              const Icon = isPositive ? Sparkles : AlertTriangle
              return (
                <li
                  key={a.kind + a.message}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${tone}`}
                  data-anomaly-kind={a.kind}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{a.message}</span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
