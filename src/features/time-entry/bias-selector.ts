/**
 * iter259 ai-automation: TimeEntry[] + Item description lookup から
 * `BiasSample[]` (computeEstimateBias 入力) を組み立てる pure 関数。
 *
 * - itemId が null の TimeEntry (= 個別タスクに紐付かない作業) は除外。
 *   bias 集計対象は「Item に紐付いた actual」なので、外形作業は混ぜない。
 * - description から見積を抽出できなければ `estimateMinutes: null` で
 *   sample に含める (集計側で totalCount に加算され、ratio 計算からは除外)。
 *
 * Service / hooks / Server Action の境界を持たない pure 関数なので
 * client / server どちらからでも呼べる。
 */
import { extractEstimateMinutes } from '@/features/item/estimate'

import type { BiasSample } from './bias'
import type { TimeEntry } from './schema'

export interface ItemDescriptionLookup {
  /** itemId → description (見つからなければ null/undefined) */
  get(itemId: string): string | null | undefined
}

export function selectBiasSamples(
  entries: readonly TimeEntry[],
  lookup: ItemDescriptionLookup,
): BiasSample[] {
  const samples: BiasSample[] = []
  for (const e of entries) {
    if (!e.itemId) continue
    const desc = lookup.get(e.itemId)
    const estimate = extractEstimateMinutes(desc)
    samples.push({
      actualMinutes: e.durationMinutes,
      estimateMinutes: estimate ?? null,
    })
  }
  return samples
}

/** Item-like (id + description) の配列から `Map` lookup を組み立てる便利関数。 */
export function buildItemDescriptionLookup<T extends { id: string; description: string | null }>(
  items: readonly T[],
): ItemDescriptionLookup {
  const map = new Map<string, string | null>()
  for (const it of items) map.set(it.id, it.description)
  return {
    get: (id) => map.get(id),
  }
}
