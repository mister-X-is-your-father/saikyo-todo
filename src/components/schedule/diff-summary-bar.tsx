'use client'

import { AlertTriangle, CheckCircle2, MinusCircle, TrendingUp, Zap } from 'lucide-react'

import { type DiffRow, summarizeDiff } from '@/features/schedule/diff-summary'
import type { Schedule } from '@/features/schedule/schema'

const SEVERITY_STYLE: Record<DiffRow['severity'], string> = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  warn: 'border-amber-300 bg-amber-50 text-amber-800',
  danger: 'border-rose-300 bg-rose-50 text-rose-700',
  not_done: 'border-slate-300 bg-slate-100 text-slate-600',
  interrupt: 'border-purple-300 bg-purple-50 text-purple-700',
}

const SEVERITY_ICON: Record<DiffRow['severity'], React.ReactNode> = {
  ok: <CheckCircle2 className="h-3 w-3" />,
  warn: <TrendingUp className="h-3 w-3" />,
  danger: <AlertTriangle className="h-3 w-3" />,
  not_done: <MinusCircle className="h-3 w-3" />,
  interrupt: <Zap className="h-3 w-3" />,
}

interface Props {
  schedules: Schedule[]
  itemTitleById: Map<string, string>
  onSelect?: (itemId: string | null) => void
}

function fmtMin(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${m}m`
}

function deltaLabel(delta: number): string {
  if (delta === 0) return '±0'
  return `${delta > 0 ? '+' : ''}${fmtMin(Math.abs(delta) * Math.sign(delta))}`
}

export function DiffSummaryBar({ schedules, itemTitleById, onSelect }: Props) {
  const rows = summarizeDiff(schedules)
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground py-2 text-xs">
        想定 / 実測 が登録されると、ここに差分が並びます
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      {rows.map((r) => {
        const title = r.itemId ? (itemTitleById.get(r.itemId) ?? '(不明)') : '割込み / その他'
        const cls = SEVERITY_STYLE[r.severity]
        return (
          <button
            key={r.itemId ?? '__interrupt__'}
            type="button"
            onClick={() => onSelect?.(r.itemId)}
            className={`inline-flex max-w-[260px] items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${cls} hover:opacity-90`}
            title={`想定 ${fmtMin(r.plannedMinutes)} / 実測 ${fmtMin(r.actualMinutes)}`}
          >
            {SEVERITY_ICON[r.severity]}
            <span className="truncate font-medium">{title}</span>
            <span className="shrink-0 text-[10px] opacity-80">
              {fmtMin(r.plannedMinutes)} → {fmtMin(r.actualMinutes)}
            </span>
            {r.severity !== 'interrupt' && r.plannedMinutes > 0 ? (
              <span className="shrink-0 text-[10px] font-semibold">
                {deltaLabel(r.deltaMinutes)}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
