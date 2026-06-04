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
      <span className="truncate font-medium" aria-hidden="true">
        {label}
      </span>
      {delta !== undefined ? (
        <span className="shrink-0 text-[10px] font-semibold opacity-90" aria-hidden="true">
          {delta}
        </span>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      // iter598 basics: visual chip は text-xs / py-1 で 20px 高 (≪ 44px) のため
      // pseudo `::before` で tap target を 44x44 化 (WCAG 2.5.5 / 2.5.8 対応)。
      // operation-board-widget iter514 / activity-log iter507 / subtasks-panel iter505
      // と同 pattern (visual layout 不変、SR / mouse / touch 全 path で interactive)。
      <button
        type="button"
        onClick={onClick}
        className={cn(
          baseCls,
          "relative before:absolute before:-inset-3 before:content-['']",
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        )}
        aria-label={ariaLabel ?? label}
        // iter1761: SeverityChip の visible inner span は truncate font-medium で長 label
        // 切れ、aria-label は browser tooltip にならず sighted は hover で全 label 見れず。
        // title 付与で sighted hover → 全 label disclose (ariaLabel が完全 SR text を持つので
        // visible relative の label が title に最適、共通 chip component なので全 caller で
        // 一括効果)。
        title={ariaLabel ?? label}
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
      // iter1761: static chip (onClick 無) でも sighted hover で長 label 切れの全文 disclose。
      title={ariaLabel ?? label}
      data-testid={testId}
      data-severity={severity}
    >
      {inner}
    </span>
  )
}
