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

/**
 * iter1022 refactor: USD を chip / Slack 通知 / AI brief 用 1 行に整形する canonical helper。
 *
 * 経緯: cost-month-projection.ts / cost-monthly-trend.ts に同一実装の `formatUsd(usd)` が
 * 2 file で重複していた (= safeUsd と同 motivation で 1 source of truth に集約)。本 helper で
 * 両 file から再利用、新規 cost chip 追加時も同じ整形を強制。
 *
 * 仕様:
 *   - safe = `safeUsd(usd)` (= NaN / 負値 / Infinity → 0 fallback) で sanitize
 *   - safe < 1 → 3 桁小数 (= `'$0.123'` / `'$0.001'`、micro cost を区別)
 *   - safe >= 1 → 2 桁小数 (= `'$1.23'` / `'$12.50'`、人が読みやすい大粒度)
 *   - safe === 0 → `'$0.00'` (= sentinel、3 桁にしない)
 *
 * 注: safeUsd は usd > 0 を要求するが、本 helper は表示用なので 0 も valid (= `'$0.00'`)。
 * 旧 inline 実装は `Math.max(0, usd)` を使い、本 helper では `safeUsd(usd)` 経由で同等動作。
 */
export function formatUsd(usd: number): string {
  const safe = safeUsd(usd)
  if (safe === 0) return '$0.00'
  const decimals = safe < 1 ? 3 : 2
  return `$${safe.toFixed(decimals)}`
}
