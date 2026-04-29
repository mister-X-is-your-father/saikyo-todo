/**
 * iter385 refactor: rate (0..1 の少数) をパーセント整数に丸める汎用ヘルパ。
 *
 * `Math.round(rate * 100)` の 12+ inline callsite (due-hit-rate /
 * dod-coverage / due-date-coverage / description-coverage / hygiene-debt /
 * hygiene-axis-focus / combined-hygiene 等) を 1 source of truth に集約。
 *
 * - 入力: 0..1 の少数 (typescript で number)
 * - 出力: 0..100 の整数 (Math.round で 0 桁丸め)
 *
 * 動作 1:1 (Math.round と同じ): 0.5 → 50 / 0.667 → 67 / 0 → 0 / 1 → 100。
 * 0..1 範囲外 (NaN / Infinity / 負値) は呼び出し側で守る前提 (caller が事前
 * バリデーション済の rate を渡す前提、helper 内では clamp しない)。
 */
export function rateToPct(rate: number): number {
  return Math.round(rate * 100)
}
