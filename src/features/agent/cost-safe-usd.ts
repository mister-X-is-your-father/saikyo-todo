/**
 * iter625 refactor: USD コスト集計用の sanitization helper。
 *
 * `cost-monthly-trend.ts` / `cost-month-projection.ts` で同一実装の
 * `safeUsd(usd)` が 2 file で重複していたため 1 source of truth に集約。
 *
 * 仕様:
 *   - input が finite かつ正値 → そのまま返す
 *   - NaN / Infinity / -Infinity / 0 / 負値 → 0 (= 集計対象外)
 *
 * 動機: agent_invocations.cost_usd は trigger / fallback で 0 や null になり得る、
 * 累計 / 予測 で NaN を伝播させない (Math.round NaN は NaN 等)。本 helper を 1 箇所に
 * 固定することで「コスト 0 fallback」 の semantic を全 cost 集計で揃える。
 */
export function safeUsd(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0
  return usd
}
