/**
 * iter663 refactor: USD 金額を人間可読形式に整形する pure helper。
 *
 * src/features/agent/cost-monthly-trend.ts と src/features/agent/cost-month-projection.ts
 * で完全に同じ実装が duplicate されていたので集約。AI コスト集計系 (現在 / 予測 /
 * 上限 / 月次差分) で多用される。
 *
 * 仕様:
 *   - 1 USD 未満は 3 桁固定 (例: `$0.123` / `$0.001`)
 *   - 1 USD 以上は 2 桁固定 (例: `$1.23` / `$1234.56`)
 *   - `$0` は `$0.000` (= safe < 1 として 3 桁、入力 0 が桁数 ambiguous なら 3 桁優先で人が誤認しにくい)
 *   - 非数 / 負数は 0 として扱う (cost は非負前提)
 */
export function formatUsd(usd: number): string {
  const safe = Number.isFinite(usd) ? Math.max(0, usd) : 0
  const decimals = safe < 1 ? 3 : 2
  return `$${safe.toFixed(decimals)}`
}
