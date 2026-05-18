/**
 * iter955 refactor: 浮動小数 1 桁丸めの共通 helper。
 *
 * 経緯: `Math.round(n * 10) / 10` (= 1 桁丸め) が src/ 配下 8 箇所に重複していた:
 *   - features/pdca/cycle-check-stats.ts (avg / median 1 桁丸め)
 *   - features/pdca/service.ts (avg / p50 / p95 各 1 桁丸め)
 *   - features/item/completion-days-by-priority.ts (avgDays / gapDays)
 *   - features/item/slip-days.ts (local round1 だが export なし)
 *   - features/agent/structured-plan.ts (computePlanSpeedupRatio、iter944 追加分)
 *
 * 全部「duration / score / ratio を chip 表示用に 1 桁丸め」 という同 semantics。
 * 本 helper に集約して inline 重複を排除、新規 caller も同 1 行で使える。
 *
 * test 安定 (浮動小数の rerun 不変) + caller 側の式が読みやすくなる。
 */

/**
 * 浮動小数を 1 桁 (= 小数点以下 1 桁) で丸める。
 *
 *   round1(1.4545) → 1.5
 *   round1(2.04)   → 2
 *   round1(0)      → 0
 *   round1(-1.25)  → -1.3 (= Math.round の banker rounding ではなく away-from-zero)
 */
export function round1(n: number): number {
  return Math.round(n * 10) / 10
}
