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

// iter1530: SEVERITY_CLASSES 5 severity (ok/info/warn/danger/muted) は border/bg/text/ring
// 4 軸とも light 固定。iter1376/1493/1512-1529 chip dark sweep + iter1528 MUST badge /
// iter1529 status-visual と並ぶ高 leverage central feature 着地。各 field 末尾に dark variant
// 併記、test (severity.test.ts) は `^border-`/`^bg-`/`^text-`/.toContain('emerald') 形式の
// substring/prefix check で dark variant 追加に透過。
const SEVERITY_CLASSES: Record<Severity, SeverityClasses> = {
  ok: {
    border: 'border-emerald-300 dark:border-emerald-900/50',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-200 dark:ring-emerald-900/50',
  },
  info: {
    border: 'border-sky-300 dark:border-sky-900/50',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-200 dark:ring-sky-900/50',
  },
  warn: {
    border: 'border-amber-300 dark:border-amber-900/50',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-900/50',
  },
  danger: {
    border: 'border-rose-300 dark:border-rose-900/50',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-200 dark:ring-rose-900/50',
  },
  muted: {
    border: 'border-slate-300 dark:border-slate-700/50',
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    text: 'text-slate-600 dark:text-slate-400',
    ring: 'ring-slate-200 dark:ring-slate-700/50',
  },
}

export function severityClasses(severity: Severity): SeverityClasses {
  return SEVERITY_CLASSES[severity]
}

/**
 * iter500 refactor: chip 用の Tailwind class string (bg + text + border のみ) を 1 行で。
 *
 * 用途: caller が `<span className={`rounded border px-2 py-0.5 ${severityChipClass(sev)}`}>`
 * のように severityClasses の 3 軸を bg/text/border 合体形で取りたい時 1 行で取れる。
 *
 * iter495 fourStateHintToSeverity bridge 経由の caller (WeeklyInsightWidget /
 * InboxView / ActivityLog / NotificationBell) で繰り返し書かれていた
 * `${classes.bg} ${classes.text} ${classes.border}` 連結を 1 関数に集約。ring は
 * focus 用なので chip 静的配色には含めない。
 */
export function severityChipClass(severity: Severity): string {
  const c = severityClasses(severity)
  return `${c.bg} ${c.text} ${c.border}`
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

/**
 * iter546 ai-automation: ChipTone3 → 共通 5 段 Severity bridge (severityToChipTone3 の逆)。
 * dashboard-chip 群が ChipTone3 を入力に取る場合の counts → severity counts 集約用。
 *
 *   'good'    → 'ok'      (= 達成 / 健全)
 *   'neutral' → 'muted'   (= 中立、判断材料外)
 *   'warn'    → 'warn'    (= 警戒)
 *
 * ChipTone3 は 3 値 lossy (severity の info / danger は warn に collapse される)、
 * ChipTone3 → Severity の逆 bridge は「neutral=muted」 が default として安全な選択。
 * 本 bridge は ChipTone3 で書かれた既存 dashboard chip 出力を共通 severity counts
 * 集約 path に乗せるための glue helper。
 */
export function chipTone3ToSeverity(tone: ChipTone3): Severity {
  if (tone === 'good') return 'ok'
  if (tone === 'warn') return 'warn'
  return 'muted'
}

/**
 * iter546 ai-automation: `Record<ChipTone3, number>` (dashboard-chip 3 段別件数) を
 * 共通 5 段 Severity counts に集約する pure helper。
 *
 * iter533-545 と同 pattern (= 14 ドメイン目)。caller は dashboard-chip 群の
 * tone 別件数 distribution を 1 行 severity サマリ
 * (例: 「警戒 2 / OK 3 / なし 5 (合計 10)」) で出せる。
 */
export function chipTone3CountsToSeverityCounts(
  counts: Record<ChipTone3, number>,
): Record<Severity, number> {
  return {
    ok: counts.good ?? 0,
    info: 0,
    warn: counts.warn ?? 0,
    danger: 0,
    muted: counts.neutral ?? 0,
  }
}

/**
 * iter532 refactor: AI prompt / chip aria-label / Slack 通知 用 1 行 severity counts summary。
 *
 *   formatSeverityCountsJa({ok:3, warn:2, danger:1, info:0, muted:0}) →
 *     'OK 3 / 注意 2 / 危険 1 (合計 6)'
 *   formatSeverityCountsJa({ok:0, info:0, warn:0, danger:0, muted:0}) →
 *     '0 件'
 *
 * 順序: 視認重要度順 (danger → warn → info → ok → muted)、件数 0 の severity は省略。
 *
 * 用途: SeverityChip 群の sub-header label、Slack 通知 chip 概要、AI prompt の status 集計
 * 1 行 (= 「全件 ok」 か 「危険 1 含む」 か即判別可能)。
 *
 * label JA: danger=危険、warn=注意、info=情報、ok=OK、muted=なし。
 */
const SEVERITY_LABEL_JA: Record<Severity, string> = {
  danger: '危険',
  warn: '注意',
  info: '情報',
  ok: 'OK',
  muted: 'なし',
}

const SEVERITY_DISPLAY_ORDER: readonly Severity[] = ['danger', 'warn', 'info', 'ok', 'muted']

export function severityLabelJa(severity: Severity): string {
  return SEVERITY_LABEL_JA[severity]
}

export function formatSeverityCountsJa(counts: Record<Severity, number>): string {
  const parts: string[] = []
  let total = 0
  for (const sev of SEVERITY_DISPLAY_ORDER) {
    const n = counts[sev] ?? 0
    if (n > 0) {
      parts.push(`${SEVERITY_LABEL_JA[sev]} ${n}`)
      total += n
    }
  }
  if (parts.length === 0) return '0 件'
  return `${parts.join(' / ')} (合計 ${total})`
}
