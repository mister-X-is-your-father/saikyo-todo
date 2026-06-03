'use client'

import { AlertTriangle, CheckCircle2, MinusCircle, TrendingUp, Zap } from 'lucide-react'

import { type Severity } from '@/lib/widget/severity'

import { type DiffRow, summarizeDiff } from '@/features/schedule/diff-summary'
import type { Schedule } from '@/features/schedule/schema'

import { SeverityChip } from '@/components/shared/severity-chip'

/**
 * diff-summary 5 値 (`ok|warn|danger|not_done|interrupt`) を
 * widget 共通 5 値 Severity (`ok|info|warn|danger|muted`) に縮約する。
 * - ok / warn / danger は同じ
 * - not_done (= 想定あり実測 0) → muted (灰色、未実行軸)
 * - interrupt (= 割込み) → info (sky、別 category)
 */
function toSeverity(s: DiffRow['severity']): Severity {
  if (s === 'not_done') return 'muted'
  if (s === 'interrupt') return 'info'
  return s
}

const ICON_BY_DIFF_SEVERITY: Record<DiffRow['severity'], React.ReactNode> = {
  ok: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  warn: <TrendingUp className="h-3 w-3" aria-hidden="true" />,
  danger: <AlertTriangle className="h-3 w-3" aria-hidden="true" />,
  not_done: <MinusCircle className="h-3 w-3" aria-hidden="true" />,
  interrupt: <Zap className="h-3 w-3" aria-hidden="true" />,
}

const SEVERITY_LABEL_JA: Record<DiffRow['severity'], string> = {
  ok: '想定通り',
  warn: '注意 (1.1〜1.5x)',
  danger: '危険 (1.5x 超過)',
  not_done: '未実施',
  interrupt: '割込み',
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
      <div className="text-muted-foreground py-2 text-xs" role="status" aria-live="polite">
        想定 / 実測 が登録されると、ここに差分が並びます
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      {rows.map((r) => {
        const title = r.itemId ? (itemTitleById.get(r.itemId) ?? '(不明)') : '割込み / その他'
        const sevLabel = SEVERITY_LABEL_JA[r.severity]
        const showDelta = r.severity !== 'interrupt' && r.plannedMinutes > 0
        const deltaText = showDelta ? ` 差分 ${deltaLabel(r.deltaMinutes)}` : ''
        return (
          <SeverityChip
            key={r.itemId ?? '__interrupt__'}
            severity={toSeverity(r.severity)}
            icon={ICON_BY_DIFF_SEVERITY[r.severity]}
            label={`${title}  ${fmtMin(r.plannedMinutes)} → ${fmtMin(r.actualMinutes)}`}
            delta={showDelta ? deltaLabel(r.deltaMinutes) : undefined}
            // iter1189: 旧 ariaLabel `${sevLabel}: ${title} 想定 ...` は visible "{title}" を
            // 中位置 "{sevLabel}: **{title}** ..." に持ち voice control prefix-matching
            //「click {title}」 match 不可 (onClick あり時 button render なので visible-prefix 必要)。
            // visible {title} 冒頭固定 + em-dash 区切で sevLabel を descriptive 末尾保持。
            // iter1705: 旧 `${sevLabel}: 想定 ...` の colon は iter1629 / iter1701 / iter1702 /
            // iter1703 sweep (em-dash + colon 無 natural-reading convention) と divergent。
            // `${sevLabel} 想定 ...` に統一、SR 読み上げが sibling chip family と整合。
            ariaLabel={`${title} — ${sevLabel} 想定 ${fmtMin(r.plannedMinutes)} 実測 ${fmtMin(r.actualMinutes)}${deltaText}`}
            className="max-w-[260px]"
            onClick={onSelect ? () => onSelect(r.itemId) : undefined}
            testId={`diff-chip-${r.itemId ?? 'interrupt'}`}
          />
        )
      })}
    </div>
  )
}
