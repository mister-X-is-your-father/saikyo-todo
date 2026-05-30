/**
 * iter335 refactor: trend chip (↑↓→·) の glyph + Tailwind class を集約。
 *
 * 3 callsite で同じ shape の TREND_TONE map が散らばっていた:
 *   - `top-items-by-time-chip.tsx` (iter321) — `WeeklyTimeDirection`、up=blue
 *     (時間 多い=活動 増)
 *   - `dashboard-view.tsx` (iter331) — velocity trend、up=blue (done 件数 増)
 *   - `budget-panel.tsx` (iter333) — `CostMonthDirection`、up=amber (cost 増=危険、
 *     down=emerald 安心 = polarity 反転)
 *
 * 構造は同じだが「up が good か bad か」のドメイン意味で配色が逆転する。
 * `polarity` 引数で「'positive' (up=better) / 'negative' (up=warning)」を切替、
 * glyph (↑↓→·) は polarity 不問の共通 map。
 *
 * iter325/iter330 で集約した date helper / parseDateOrNull と同じ「同 shape の
 * 散在を 1 file に」という方針。
 */

export type TrendDirection = 'up' | 'down' | 'flat' | 'idle'

export const TREND_GLYPH: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
  idle: '·',
}

/**
 * polarity 別の意味づけ:
 *  - `positive` … up=blue (活動増 / 達成 / モチベ +)、down=red (失速 / 後退 -)
 *  - `negative` … up=amber (コスト増 / エラー増 / 危険信号)、down=emerald (改善)
 *
 * flat / idle は polarity 不問で muted (中立)。
 */
export type TrendPolarity = 'positive' | 'negative'

// iter1536: 4 trend tone class は light 固定 (bg-{color}-50 + text-{color}-700 + border-{color}-200)
// で iter1376/1493/1512-1535 chip dark sweep + central vocabulary 着地 (MUST iter1528 /
// status iter1529 / severity iter1530 / chip-tone iter1531) と同 pattern。各 class に dark
// variant 併記、test (trend-tone.test.ts) は厳密 toBe で expected strings 4 件同 commit migration。
// NEUTRAL_CLASS は既に theme-aware なので touch なし。
const NEUTRAL_CLASS = 'bg-muted text-muted-foreground border-border'
const POSITIVE_UP_CLASS =
  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50'
const POSITIVE_DOWN_CLASS =
  'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50'
const NEGATIVE_UP_CLASS =
  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50'
const NEGATIVE_DOWN_CLASS =
  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50'

export function trendToneClass(
  direction: TrendDirection,
  polarity: TrendPolarity = 'positive',
): string {
  if (direction === 'flat' || direction === 'idle') return NEUTRAL_CLASS
  if (polarity === 'positive') {
    return direction === 'up' ? POSITIVE_UP_CLASS : POSITIVE_DOWN_CLASS
  }
  return direction === 'up' ? NEGATIVE_UP_CLASS : NEGATIVE_DOWN_CLASS
}

export function trendGlyph(direction: TrendDirection): string {
  return TREND_GLYPH[direction]
}
