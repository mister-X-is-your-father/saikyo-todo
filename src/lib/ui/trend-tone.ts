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

const NEUTRAL_CLASS = 'bg-muted text-muted-foreground border-border'
const POSITIVE_UP_CLASS = 'bg-blue-50 text-blue-700 border-blue-200'
const POSITIVE_DOWN_CLASS = 'bg-red-50 text-red-700 border-red-200'
const NEGATIVE_UP_CLASS = 'bg-amber-50 text-amber-700 border-amber-200'
const NEGATIVE_DOWN_CLASS = 'bg-emerald-50 text-emerald-700 border-emerald-200'

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
