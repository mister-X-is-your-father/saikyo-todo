'use client'

/**
 * iter318 basics: iter317 で整備済 `selectTopItemsByTime` substrate (19/19 PASS)
 * の UI bind。直近 7 日 (今日含む) の time_entries から **item 別 top 5** を 1 行
 * chip で表示する軽量カード。
 *
 * iter321 basics: iter319 `weekly-time-trend.ts` (16/16 PASS) を組み合わせて
 * 週次トレンド (今週 vs 先週、↑↓→・ + 色) を card 上部に追加。今や本 card は
 * 「直近 7 日 稼働ダッシュボード」となり、`EstimateBiasInsight` (iter259) と同
 * pattern で TimeEntries panel に常駐する。
 *
 * top 0 件 + trend idle の二重条件で card 非表示 (= 14 日完全に稼働ゼロ)。
 * top 0 件 だが trend で何らかの稼働がある (item 紐付け無し dev/meeting) 時は
 * trend chip だけ見せる。
 */

import { useMemo } from 'react'

import { Flame } from 'lucide-react'

import { isoDaysFromNow, todayISO } from '@/lib/date/iso'
import { formatMinutesJa } from '@/lib/format-duration'
import { TREND_GLYPH, trendToneClass } from '@/lib/ui/trend-tone'

import { useItems } from '@/features/item/hooks'
import { computeDailyStreak, formatStreakSummary } from '@/features/time-entry/daily-streak'
import { useTimeEntries } from '@/features/time-entry/hooks'
import { formatTopItemsByTime, selectTopItemsByTime } from '@/features/time-entry/item-time-summary'
import {
  findPeakWeekday,
  formatWeekdayTimeDistributionJa,
  groupTimeEntriesByWeekday,
  weekdayLabelJa,
} from '@/features/time-entry/weekday-time-distribution'
import {
  computeWeeklyTimeTrend,
  formatWeeklyTimeTrendJa,
  splitTimeEntriesByWeek,
} from '@/features/time-entry/weekly-time-trend'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TOP_N = 5
const WINDOW_DAYS = 7

// iter335 refactor: TREND_TONE は lib/ui/trend-tone.ts に集約
// (3 callsite 重複削除、polarity='positive' で時間軸 = 時間多い → blue)。

export function TopItemsByTimeChip({ workspaceId }: { workspaceId: string }) {
  const entriesQ = useTimeEntries(workspaceId)
  const itemsQ = useItems(workspaceId)

  const summary = useMemo(() => {
    if (!entriesQ.data) return null
    const today = todayISO()
    const from = isoDaysFromNow(-(WINDOW_DAYS - 1))
    const top = selectTopItemsByTime(entriesQ.data, TOP_N, { from, to: today })
    const titles = new Map<string, string>()
    for (const it of itemsQ.data ?? []) titles.set(it.id, it.title)
    const { thisWeek, priorWeek } = splitTimeEntriesByWeek(entriesQ.data, today)
    const trend = computeWeeklyTimeTrend(thisWeek, priorWeek)
    // top 0 件かつ trend idle (= 14 日 完全に稼働ゼロ) なら card 非表示で UI 静か
    if (top.length === 0 && trend.direction === 'idle') return null
    // iter328 basics: 直近 14 日 (thisWeek + priorWeek) の曜日別分布。
    // 7 日だと各曜日が 1 回しか出ず pattern にならないので、trend 同様 14 日を使う。
    const weekdayTotals = groupTimeEntriesByWeekday([...thisWeek, ...priorWeek])
    const peak = findPeakWeekday(weekdayTotals)
    const weekdayLine = formatWeekdayTimeDistributionJa(weekdayTotals)
    // iter330 basics: daily-streak (iter327) を bind。entries 全件で計算 (Set
    // dedupe で O(N+D))。Duolingo 風の「連続 N 日」モチベーション指標。
    const streak = computeDailyStreak(entriesQ.data, today)
    const streakLine = formatStreakSummary(streak, today)
    return {
      top,
      line: formatTopItemsByTime(top, titles),
      titles,
      trend,
      trendLine: formatWeeklyTimeTrendJa(trend),
      weekdayTotals,
      weekdayLine,
      peak,
      streak,
      streakLine,
    }
  }, [entriesQ.data, itemsQ.data])

  if (!summary) return null
  const toneClass = trendToneClass(summary.trend.direction, 'positive')
  const toneGlyph = TREND_GLYPH[summary.trend.direction]
  const peakLabel = summary.peak
    ? `曜日 peak: ${weekdayLabelJa(summary.peak.key)}曜 (${formatMinutesJa(summary.peak.minutes)})`
    : null
  const fullWeekdayAria = peakLabel ? `${peakLabel} — 直近 14 日 ${summary.weekdayLine}` : null
  const streakActive = summary.streak.currentStreak > 0
  // iter1518: streak active chip は light 固定で dark mode で明色 box 浮き
  // (iter1515/1516/1517 chip dark sweep の最後の 1 件)。
  const streakClass = streakActive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50'
    : 'bg-muted text-foreground border-border'

  return (
    <Card
      data-testid="top-items-by-time-chip"
      role="region"
      aria-labelledby="top-items-by-time-heading"
    >
      <CardHeader>
        <CardTitle
          id="top-items-by-time-heading"
          className="text-base"
          role="heading"
          aria-level={2}
        >
          <span aria-hidden="true">直近 {WINDOW_DAYS} 日 稼働ダッシュボード</span>
          <span className="sr-only">{`${summary.trendLine}。${summary.streakLine}。${peakLabel ? `${peakLabel}。` : ''}${summary.line}`}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <div
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${toneClass}`}
            data-testid="weekly-time-trend-chip"
            data-direction={summary.trend.direction}
            role="status"
            aria-live="polite"
            aria-label={summary.trendLine}
          >
            <span aria-hidden="true" className="font-mono">
              {toneGlyph}
            </span>
            <span aria-hidden="true">{summary.trendLine}</span>
          </div>
          <div
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${streakClass}`}
            data-testid="daily-streak-chip"
            data-streak-active={streakActive ? 'true' : 'false'}
            role="status"
            aria-live="polite"
            aria-label={summary.streakLine}
            title={`連続稼働: ${summary.streak.currentStreak} 日 / 最長 ${summary.streak.longestStreak} 日`}
          >
            <Flame className="h-3 w-3" aria-hidden="true" />
            <span aria-hidden="true">{summary.streakLine}</span>
          </div>
        </div>
        {peakLabel && fullWeekdayAria ? (
          <div
            // iter1397: 旧 className に text-muted-foreground と text-amber-800 が混在し、
            // muted-foreground (theme-aware) が勝って dark で明色化 → light 固定 bg-amber-50 上で
            // 2.49:1 (WCAG 1.4.3)。余計な text-muted-foreground を除去し、bg/text/border に dark 変種を
            // 付与して両モード amber chip として pass させる。
            className="border-border mb-3 inline-flex items-center gap-1.5 rounded border bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            data-testid="weekday-time-distribution-chip"
            data-peak={summary.peak?.key}
            role="status"
            aria-live="polite"
            aria-label={fullWeekdayAria}
            title={fullWeekdayAria}
          >
            <span aria-hidden="true" className="font-mono">
              ▤
            </span>
            <span aria-hidden="true" className="truncate">
              {peakLabel}
            </span>
          </div>
        ) : null}
        {summary.top.length === 0 ? (
          <p
            className="text-muted-foreground text-xs"
            role="status"
            aria-live="polite"
            data-testid="top-items-by-time-empty"
          >
            直近 {WINDOW_DAYS} 日 — Item 紐付けの稼働記録なし (自由稼働のみ)
          </p>
        ) : (
          <ol
            className="space-y-1"
            /* iter1590: 旧 aria-label paren convention `"直近 X 日 Item 別稼働 top Y 件 (合計時間が多い順)"` は
               iter1093-1589 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
            aria-label={`直近 ${WINDOW_DAYS} 日 Item 別稼働 top ${summary.top.length} 件 — 合計時間が多い順`}
          >
            {summary.top.map((row, idx) => {
              const title = summary.titles.get(row.itemId) ?? '(無題)'
              const label = formatMinutesJa(row.totalMinutes)
              return (
                <li
                  key={row.itemId}
                  className="flex items-center gap-2 text-xs"
                  data-testid={`top-items-by-time-row-${idx + 1}`}
                >
                  <span
                    className="bg-muted text-foreground inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate" title={title}>
                    {title}
                  </span>
                  {/* iter1078 basics: role="img" 付与で SR aria-label authoritative 化
                      25 弾目 (iter1023/1049-1077 sweep 続編)。top-items-by-time-chip 各
                      row 末尾 2 chip (合計時間 / entryCount) は role 無 span + aria-label
                      のみで SR picked-up divergence。両 span に role="img" 付与で統一。 */}
                  <span className="font-mono tabular-nums" role="img" aria-label={`合計 ${label}`}>
                    <span aria-hidden="true">{label}</span>
                  </span>
                  <span
                    className="text-muted-foreground text-[10px] tabular-nums"
                    role="img"
                    aria-label={`${row.entryCount} 件`}
                  >
                    <span aria-hidden="true">{row.entryCount} 件</span>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
