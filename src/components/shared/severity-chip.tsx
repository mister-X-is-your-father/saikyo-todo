/**
 * iter (post-loop, leverage substrate): widget 全体で共有する severity chip。
 *
 * 既存 (refactor 候補): `diff-summary-bar.tsx` の SEVERITY_STYLE / SEVERITY_ICON、
 * `dashboard-chip.tsx` の ChipTone3 — 配色 token が散在していたのを統合。
 *
 * 使い方:
 *   <SeverityChip severity="warn" label="Task A: 想定 60m / 実測 90m" delta="+30m" />
 *
 * Props で icon / onClick / aria-label / 追加 className を受ける。最小 / 最大幅は
 * 呼び出し側で `className="max-w-[260px]"` 等で指定する (chip 配置 context 依存のため)。
 */
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { type Severity, severityClasses } from '@/lib/widget/severity'

interface Props {
  severity: Severity
  /** chip の主タイトル (truncate 推奨) */
  label: string
  /** 副 text (件数 / delta 等、optional) */
  delta?: string | number
  /** 左側 icon (lucide-react を呼出側で渡す) */
  icon?: ReactNode
  /** click で何かする場合 (フィルタ jump 等)。なければ chip は static */
  onClick?: () => void
  /** SR 用の完全 label (truncate 中の title 補足、省略時は label を流用) */
  ariaLabel?: string
  className?: string
  testId?: string
}

export function SeverityChip({
  severity,
  label,
  delta,
  icon,
  onClick,
  ariaLabel,
  className,
  testId,
}: Props) {
  const c = severityClasses(severity)
  const baseCls = cn(
    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
    c.border,
    c.bg,
    c.text,
    onClick && 'hover:opacity-90 cursor-pointer',
    className,
  )

  const inner = (
    <>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span className="truncate font-medium">{label}</span>
      {delta !== undefined ? (
        <span className="shrink-0 text-[10px] font-semibold opacity-90">{delta}</span>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseCls}
        aria-label={ariaLabel ?? label}
        data-testid={testId}
        data-severity={severity}
      >
        {inner}
      </button>
    )
  }

  return (
    // role="img" (atomic group with aria-label) — iter98 PDCA bar /
    // iter417 TaskChute priority chip と同 pattern。旧 role="status" は live
    // region で SR が再描画のたびに announce するため、静的 chip では誤用。
    <span
      role="img"
      className={baseCls}
      aria-label={ariaLabel ?? label}
      data-testid={testId}
      data-severity={severity}
    >
      {inner}
    </span>
  )
}
