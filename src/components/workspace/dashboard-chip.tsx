/**
 * iter355 refactor: Dashboard 上部の trend / hygiene chip 8 種で重複していた JSX
 * 構造を 1 component に集約。
 *
 * 抽出元 (`dashboard-view.tsx` 内 8 chip):
 *   velocity / momentum / due-coverage / dod-coverage / aging / due-hit-rate /
 *   slip-days / completion-gap
 *
 * 共通契約:
 *   - `<div className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs ...tone">`
 *   - role="status"、`aria-label` / `title` で full text、`data-testid="..."`
 *   - 子: glyph span (font-mono, aria-hidden) + text span (aria-hidden, optional truncate)
 *
 * `dataAttrs` で chip 固有の data-* hook (e.g. `data-trend`, `data-coverage-pct`,
 * `data-severe`) を任意指定。
 */
import type { ReactNode } from 'react'

export interface DashboardChipProps {
  /** Playwright / 自動 test 用 anchor (`'dashboard-velocity-chip'` 等) */
  testId: string
  /** 完成済 Tailwind class string (border + bg + text)。tone helper の return 値をそのまま受ける */
  toneClass: string
  /** 先頭の glyph (絵文字 / Lucide icon / 文字)。`aria-hidden` で SR からは隠す */
  glyph: ReactNode
  /** SR 読み上げ用 full text。視覚 chip より長くて構わない */
  ariaLabel: string
  /** hover tooltip。通常 `ariaLabel` と同じ or 短い summary */
  title: string
  /** visible text (chip 本体)。`aria-hidden` で SR からは隠す (= aria-label が代替) */
  text: ReactNode
  /** chip 幅が狭い時 text を `truncate` で切る (= aging chip 等) */
  truncateText?: boolean
  /**
   * 追加 data-* attrs。chip 固有 hook (e.g. `{ 'data-trend': 'up' }`)。
   * key は `data-` で始まる文字列、value は string | number | boolean。
   */
  dataAttrs?: Record<string, string | number | boolean>
  /**
   * iter376: 緊急度の高い chip (MUST 違反 / overdue 重大 等) は role="alert" +
   * aria-live="assertive" に切替えて SR が割込み読上げ。default false (= role="status"
   * + aria-live="polite")。
   */
  attention?: boolean
}

const BASE_CLASS = 'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs'

/**
 * 'good' (達成 / 健全 = emerald) / 'neutral' (中立 = muted) / 'warn' (警戒 = amber)
 * の 3 値 tone を Tailwind class に一括変換する糖衣。due-hit-rate / due-coverage /
 * dod-coverage の chip で 3 重複していた式を集約。
 */
export type ChipTone3 = 'good' | 'neutral' | 'warn'

// iter1513: good/warn の border + bg + text は light 固定、dark mode で明色 box が
// dark page 上に浮き emerald-700 / amber-700 text 色も contrast 不適。iter1376 / iter1493 /
// iter1512 の `dark:border-{color}-900/50 dark:bg-{color}-950/30 dark:text-{color}-300`
// pattern を 2 tone に展開。neutral は CSS var で theme-aware なので touch なし。
const TONE3_CLASS: Record<ChipTone3, string> = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
  neutral: 'border-border bg-muted text-foreground',
  warn: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
}

export function chipTone3Class(tone: ChipTone3): string {
  return TONE3_CLASS[tone]
}

export function DashboardChip({
  testId,
  toneClass,
  glyph,
  ariaLabel,
  title,
  text,
  truncateText = false,
  dataAttrs,
  attention = false,
}: DashboardChipProps) {
  // iter378: attention chip は SR の assertive 読上げに加えて、視覚的にも目立たせる
  // ため `ring-2 ring-red-400/60` を追加 (border / bg は toneClass の指定を尊重)。
  // Tailwind ring は border の outside にレンダリングされるので chip 寸法は不変、
  // 純粋な視覚 hint として overlay される。
  const attentionClass = attention ? ' ring-2 ring-red-400/60' : ''
  return (
    <div
      className={`${BASE_CLASS} ${toneClass}${attentionClass}`}
      data-testid={testId}
      role={attention ? 'alert' : 'status'}
      aria-live={attention ? 'assertive' : 'polite'}
      /* iter1710: ARIA 1.2 spec で role="status" / role="alert" の implicit
         aria-atomic は true だが、browser / SR 実装は inconsistent (Chrome/JAWS は
         partial announce、Firefox/NVDA は full announce 等)。bulk-action-bar
         bulk-count (line 86) / today-view chip 2 件 (iter1709) と同 sweep で
         explicit `aria-atomic="true"` を付与し、chip 数字や label 変化時に SR が
         chip 全体を full re-announce する behavior を 1 source で保証。
         全 dashboard chip (= 約 20 chip) に一括適用、partial announce による
         context 欠落を解消。 */
      aria-atomic="true"
      aria-label={ariaLabel}
      title={title}
      {...(dataAttrs ?? {})}
    >
      <span aria-hidden="true" className="font-mono">
        {glyph}
      </span>
      <span aria-hidden="true" className={truncateText ? 'truncate' : undefined}>
        {text}
      </span>
    </div>
  )
}
