/**
 * iter405 refactor: must-* combinator (must-stuck-wip / must-overdue / must-stale) で
 * 同 shape の `for + isMust pre-filter` が 3 callsite 重複していたので 1 か所に集約。
 *
 * iter325 / iter330 / ... / iter400 と同じ「同 shape の散在を 1 file に」方針 24 弾目。
 *
 * caller (must-overdue / must-stuck-wip / must-stale など) は本 helper で isMust=true
 * 配列を取り出してから既存 base fn (pickOverdueActiveItems / selectStuckWipItems /
 * selectStaleItems) に委譲できる (= iter390 と同じ "pre-filter → 委譲" pattern を
 * 1 行 helper 呼出で表現)。
 *
 * 仕様:
 *   - it === undefined / null は除外
 *   - it.isMust === true 以外 (false / null / undefined) は除外
 *   - 元配列順 stable
 */

/** must-* combinator が共通 require する isMust フィールドの structural subset。 */
export interface MustFilterFields {
  isMust: boolean | null | undefined
}

export function filterMustOnly<T extends MustFilterFields>(items: readonly T[]): T[] {
  const out: T[] = []
  for (const it of items) {
    if (it && it.isMust) out.push(it)
  }
  return out
}
