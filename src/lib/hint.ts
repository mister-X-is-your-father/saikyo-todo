/**
 * iter445 refactor: 「count + max-of-getter」 4-state classifier 関数を集約。
 *
 * iter439 (blocked-items-hint) / iter442 (at-risk-parents-hint) で同 shape の
 * 4 状態判定ロジックが重複していたので 1 関数に集約 (= iter325 / iter330 / ... /
 * iter440 と同じ「同 shape の散在を 1 file に」方針 32 弾目)。
 *
 * 仕様:
 *  - entries 空 → 'idle' (= 該当なし)
 *  - entries の中で `getValue(e)` の最大値を計算
 *  - severeCount / severeMax いずれか満たす → 'severe'
 *  - moderateCount / moderateMax いずれか満たす → 'moderate'
 *  - それ以外 → 'mild'
 *
 * 純粋関数、副作用なし。caller 側 hint enum (例: BlockedItemsHint /
 * AtRiskParentsHint) は本 helper の `FourStateHint` を type alias として利用。
 *
 * 設計判断:
 *  - hint 文言は jp 表記 (= '依存軽微' 等) は本 helper では扱わない、caller が
 *    Record<FourStateHint, string> map で出し分け (= label 文言は domain 依存)
 *  - 5 状態以上 (= parent-items-progress hint の 'idle/stuck/slow/healthy/almostDone')
 *    は別 shape なので本 helper の対象外 (= caller が独自実装)
 */
export type FourStateHint = 'idle' | 'mild' | 'moderate' | 'severe'

export interface FourStateThresholds {
  /** moderate に上がる count 閾値 (entries.length ≥ N) */
  moderateCount: number
  /** moderate に上がる max 値閾値 (max ≥ N) */
  moderateMax: number
  /** severe に上がる count 閾値 (entries.length ≥ N) */
  severeCount: number
  /** severe に上がる max 値閾値 (max ≥ N) */
  severeMax: number
}

export function classifyByCountAndMax<E>(
  entries: readonly E[],
  getValue: (e: E) => number,
  thresholds: FourStateThresholds,
): FourStateHint {
  if (entries.length === 0) return 'idle'
  let max = 0
  for (const e of entries) {
    const v = getValue(e)
    if (v > max) max = v
  }
  if (entries.length >= thresholds.severeCount || max >= thresholds.severeMax) return 'severe'
  if (entries.length >= thresholds.moderateCount || max >= thresholds.moderateMax) return 'moderate'
  return 'mild'
}

/**
 * iter455 refactor: hint enum を jp 文言に整形する `LABEL[classify(...)]` pattern を
 * 集約。iter439 / iter442 / iter444 / iter447 / iter449 / iter454 で同 shape の
 * 1 行 lookup helper が 6 callsite で散在していたので 1 関数に集約 (= iter325 /
 * iter330 / ... / iter450 と同じ「同 shape の散在を 1 file に」方針 33 弾目)。
 *
 * 仕様:
 *  - 入力: classify (input → hint enum) + labels (hint → string)
 *  - 出力: input → string な thunk (= labels[classify(input)])
 *  - 純粋関数、副作用なし
 *
 * caller usage:
 *   export const formatXxxHintJa = makeHintLabelFormatter(classifyXxxHint, HINT_LABEL_JA)
 *
 * 既存 caller の `function formatXxxHintJa(input) { return LABEL[classify(input)] }`
 * を 1 行 export const に短縮。type signature 維持 (= input → string)。
 */
export function makeHintLabelFormatter<I, H extends string>(
  classify: (input: I) => H,
  labels: Record<H, string>,
): (input: I) => string {
  return (input) => labels[classify(input)]
}
