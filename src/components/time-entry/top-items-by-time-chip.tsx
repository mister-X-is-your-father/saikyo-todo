'use client'

/**
 * iter318 basics: iter317 で整備済 `selectTopItemsByTime` substrate (19/19 PASS)
 * の UI bind。直近 7 日 (今日含む) の time_entries から **item 別 top 5** を 1 行
 * chip で表示する軽量カード。`EstimateBiasInsight` (iter259) と同 pattern で
 * TimeEntries panel に常駐させる。
 *
 * 0 件 (entries 無し / itemId 紐付け 0 件) は card ごと非表示にして UI を静かに保つ。
 */

import { useMemo } from 'react'

import { isoDaysFromNow, todayISO } from '@/lib/date/iso'

import { useItems } from '@/features/item/hooks'
import { useTimeEntries } from '@/features/time-entry/hooks'
import { formatTopItemsByTime, selectTopItemsByTime } from '@/features/time-entry/item-time-summary'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TOP_N = 5
const WINDOW_DAYS = 7

export function TopItemsByTimeChip({ workspaceId }: { workspaceId: string }) {
  const entriesQ = useTimeEntries(workspaceId)
  const itemsQ = useItems(workspaceId)

  const summary = useMemo(() => {
    if (!entriesQ.data) return null
    const today = todayISO()
    const from = isoDaysFromNow(-(WINDOW_DAYS - 1))
    const top = selectTopItemsByTime(entriesQ.data, TOP_N, { from, to: today })
    if (top.length === 0) return null
    const titles = new Map<string, string>()
    for (const it of itemsQ.data ?? []) titles.set(it.id, it.title)
    return { top, line: formatTopItemsByTime(top, titles), titles }
  }, [entriesQ.data, itemsQ.data])

  if (!summary) return null

  return (
    <Card data-testid="top-items-by-time-chip">
      <CardHeader>
        <CardTitle className="text-base">
          <span aria-hidden="true">
            直近 {WINDOW_DAYS} 日 実績 top {summary.top.length}
          </span>
          <span className="sr-only">{summary.line}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1">
          {summary.top.map((row, idx) => {
            const title = summary.titles.get(row.itemId) ?? '(無題)'
            const minutes = row.totalMinutes
            const h = Math.floor(minutes / 60)
            const m = minutes % 60
            const label = h === 0 ? `${m}min` : m === 0 ? `${h}h` : `${h}h ${m}min`
            return (
              <li
                key={row.itemId}
                className="flex items-center gap-2 text-xs"
                data-testid={`top-items-by-time-row-${idx + 1}`}
              >
                <span
                  className="bg-muted text-muted-foreground inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1 truncate" title={title}>
                  {title}
                </span>
                <span className="font-mono tabular-nums" aria-label={`合計 ${label}`}>
                  {label}
                </span>
                <span
                  className="text-muted-foreground text-[10px] tabular-nums"
                  aria-label={`${row.entryCount} 件`}
                >
                  {row.entryCount} 件
                </span>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
