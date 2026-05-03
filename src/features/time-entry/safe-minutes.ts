/**
 * iter630 refactor: durationMinutes 集計用の sanitization helper。
 *
 * iter664 までに `item-time-summary.ts` / `weekly-time-trend.ts` /
 * `weekday-time-distribution.ts` / `daily-streak.ts` / `category-summary.ts` /
 * `daily-summary.ts` の 6 file で同等の sanitization が重複していたため
 * 1 source of truth に集約 (= time-entry 配下の集計系全 file で統一)。
 *
 * 仕様:
 *   - finite かつ正値 → Math.round(min) (= 整数化、durationMinutes は DB 上 integer
 *     なので no-op だが境界の `0.4 → 0` / `0.5 → 1` を呼出元の意図に揃える)
 *   - NaN / Infinity / -Infinity / 0 / 負値 → 0 (= 集計対象外)
 *
 * 動機: time_entries.durationMinutes は計測経路によって rounding 戦略が違う
 * (`Math.max(1, round(ms/60000))` vs `Math.floor(elapsedMs/60000)` 等)、累計 / 統計
 * で NaN を伝播させないために fail-soft で 0 にクランプする。本 helper を集約する
 * ことで「分単位 sanitization」 の semantic を全 time-entry 集計で揃える。
 */
export function safeMinutes(min: number): number {
  if (!Number.isFinite(min) || min <= 0) return 0
  return Math.round(min)
}
