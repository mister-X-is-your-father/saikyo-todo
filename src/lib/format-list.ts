/**
 * iter365 refactor: 「上位 N 件 + 残件は 他 K 件」 list summary pattern を集約。
 *
 * features/item 配下の AI brief / dashboard summary で 4 callsite に同 shape の
 * pattern が散らばっていたので 1 source of truth に集約:
 *   - `wip-stuck.ts#formatStuckWipSummaryJa` (iter359)
 *   - `must-stuck-wip.ts#formatMustStuckWipJa` (iter364)
 *   - `startable-items.ts#formatStartableItemsSummary` (iter304)
 *   - `recent-completed.ts#formatRecentCompletedSummaryJa` (iter359)
 *
 * 共通形式: `render(item1) / render(item2) / ... / 他 K 件` (separator default ' / ')。
 * caller は render fn + limit を渡すだけで、limit 超過の "他 K 件" tail を自動付加。
 */

export interface FormatTopWithOverflowOptions {
  /** items 区切り文字。default ' / ' */
  separator?: string
  /** 残件 tail の prefix。default '他 ' */
  overflowPrefix?: string
  /** 残件 tail の suffix。default ' 件' */
  overflowSuffix?: string
  /**
   * tail 計算用の全体件数を override。default は `items.length`。
   * recent-completed のように `entries` (limit 込みで pre-sliced) と `totalCount`
   * が乖離する caller は本 option で総数を渡す。`total - rendered` 件を tail にする。
   */
  totalForOverflow?: number
}

/**
 * `items` の先頭 `limit` 件を `render` で文字列化し、超過分は「他 K 件」 tail にする。
 *
 * - `items` 空 → 空文字 (caller が 0 件 sentinel を別途出す想定)
 * - `limit` ≤ 0 → 全件を tail (= '他 K 件' のみ)
 * - `items.length` ≤ `limit` → tail 無し (純粋に render の join)
 *
 * 例:
 *   formatTopWithOverflow([1,2,3,4,5], n => `n${n}`, 3) → 'n1 / n2 / n3 / 他 2 件'
 *   formatTopWithOverflow([1,2], n => `n${n}`, 5)      → 'n1 / n2'
 *   formatTopWithOverflow([], n => `n${n}`, 3)         → ''
 */
export function formatTopWithOverflow<T>(
  items: readonly T[],
  render: (item: T) => string,
  limit: number,
  options: FormatTopWithOverflowOptions = {},
): string {
  const {
    separator = ' / ',
    overflowPrefix = '他 ',
    overflowSuffix = ' 件',
    totalForOverflow,
  } = options
  const head = items.slice(0, Math.max(0, limit))
  const total = totalForOverflow ?? items.length
  const rest = total - head.length
  const parts = head.map(render)
  if (rest > 0) parts.push(`${overflowPrefix}${rest}${overflowSuffix}`)
  return parts.join(separator)
}
