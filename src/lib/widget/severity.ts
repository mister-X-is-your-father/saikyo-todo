/**
 * iter (post-loop, leverage substrate): widget 全体で共有する severity 判定 + 配色 token。
 *
 * 設計目的 (FEEDBACK_QUEUE.md fluffy → widget series 8 件 + methodology view 9 件 で再利用):
 *   - 既存の散在した severity 表現 (`'ok'|'warn'|'danger'`、`ChipTone3 'good'|'neutral'|'warn'`、
 *     diff-summary `'ok'|'warn'|'danger'|'not_done'|'interrupt'` 等) を 1 系に集約
 *   - 「actual vs target / overdue 日数 / 比率」 から severity を決める pure 関数を提供
 *   - UI は `SeverityChip` (別 file) で配色 token を消費するだけ
 *
 * 副作用なし、依存なし。pure helper + Vitest 単体 test で網羅。
 *
 * 関連:
 *   - 既存 `src/features/schedule/diff-summary.ts` の severity (Calendar 二車線 chip)
 *   - 既存 `src/components/workspace/dashboard-chip.tsx` の `ChipTone3` (Dashboard 3 値 tone)
 *   - 今後実装: 8 fluffy widget (PM Stand-up / Pre-mortem / Retro / 救済 / Plan / Brief / Weekly)
 *   - 今後実装: methodology TC-3 累積残 ticker / TC-4 routine / GT-3 Inbox process
 */

/** 5 段階 severity (汎用、widget / chip / badge 共通) */
export type Severity = 'ok' | 'info' | 'warn' | 'danger' | 'muted'

/** Tailwind class set (border / bg / text / ring 用に分割) */
export interface SeverityClasses {
  border: string
  bg: string
  text: string
  /** focus ring / 強調 ring 用 (省略可) */
  ring?: string
}

const SEVERITY_CLASSES: Record<Severity, SeverityClasses> = {
  ok: {
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
  },
  info: {
    border: 'border-sky-300',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-sky-200',
  },
  warn: {
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
  },
  danger: {
    border: 'border-rose-300',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-200',
  },
  muted: {
    border: 'border-slate-300',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    ring: 'ring-slate-200',
  },
}

export function severityClasses(severity: Severity): SeverityClasses {
  return SEVERITY_CLASSES[severity]
}

/**
 * `actual / expected` 比率から severity を返す。
 *
 * - expected ≤ 0 → 'muted' (target 不明、判定不能)
 * - actual === 0, expected > 0 → 'muted' (未実行、別軸 = not-done として呼出側で判定推奨)
 * - ratio ≤ 1.1 → 'ok' (10% 以内のずれは ok)
 * - ratio ≤ 1.5 → 'warn' (10–50% over)
 * - ratio > 1.5 → 'danger' (50% 超過)
 *
 * ratio 閾値を変えたい場合は `thresholds` で override (例: {warn: 1.05, danger: 1.3})。
 */
export interface RatioThresholds {
  /** ok / warn の境界 (default 1.1) */
  warn?: number
  /** warn / danger の境界 (default 1.5) */
  danger?: number
}

export function severityFromRatio(
  actual: number,
  expected: number,
  thresholds?: RatioThresholds,
): Severity {
  if (expected <= 0) return 'muted'
  if (actual === 0) return 'muted'
  const warnT = thresholds?.warn ?? 1.1
  const dangerT = thresholds?.danger ?? 1.5
  const r = actual / expected
  if (r <= warnT) return 'ok'
  if (r <= dangerT) return 'warn'
  return 'danger'
}

/**
 * overdue 日数から severity を返す。日数が大きいほど深刻。
 * - 0 日 (= 今日) → 'info'
 * - 1-3 日 → 'warn'
 * - 4 日以上 → 'danger'
 * - マイナス (= まだ余裕あり) → 'ok'
 */
export function severityFromOverdueDays(days: number): Severity {
  if (days < 0) return 'ok'
  if (days === 0) return 'info'
  if (days <= 3) return 'warn'
  return 'danger'
}

/**
 * "達成率" (0..1) から severity を返す (大きいほど良い軸)。
 * - 0.9 以上 → 'ok'
 * - 0.6 以上 → 'warn'
 * - 0.6 未満 → 'danger'
 * - 0 → 'muted' (= 未着手)
 *
 * 成果率 / 完了率 / coverage 系で使う (`severityFromRatio` の逆軸)。
 */
export function severityFromAchievement(rate: number): Severity {
  if (rate <= 0) return 'muted'
  if (rate >= 0.9) return 'ok'
  if (rate >= 0.6) return 'warn'
  return 'danger'
}

/**
 * 既存 `ChipTone3 'good'|'neutral'|'warn'` (dashboard-chip.tsx) との bridge。
 * 既存 component 互換性維持のため、severity → tone3 の lossy 縮約を提供する。
 * 新規 component は Severity を直接使うこと。
 */
export type ChipTone3 = 'good' | 'neutral' | 'warn'

export function severityToChipTone3(severity: Severity): ChipTone3 {
  if (severity === 'ok') return 'good'
  if (severity === 'warn' || severity === 'danger') return 'warn'
  return 'neutral'
}
