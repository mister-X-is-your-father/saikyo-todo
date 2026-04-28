/**
 * SubtasksPanel から切り離した pure helper。
 *
 * `subtasks-panel.tsx` 自体は React + TanStack hooks (server-chained env を含む)
 * を import するため vitest 直接 import で env 検証が落ちる。helper を本 file
 * に分離することで pure 関数だけを単体テスト可能にする (workflows-panel と同パターン)。
 */

import { uuidToLabel } from '@/lib/db/ltree-path'

import type { Item } from '@/features/item/schema'

/**
 * 改行区切り bulk 入力 (`textarea`) からタスク title 配列を作る。
 *
 * - 各行を trim
 * - 空行 (trim 結果が空文字) を除外
 * - 先頭・末尾の空行も自然に消える
 *
 * UI 側で Button の disabled / aria-label の現在件数表示にも同じ関数を使う
 * ので、件数の見え方と実際の追加件数を必ず一致させる重要な不変条件を担う。
 */
export function parseBulkSubtaskTitles(text: string): string[] {
  return text
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

/** Item の structural subset (ltree tree 操作で必要なフィールドのみ)。 */
export type LtreeNode = Pick<Item, 'id' | 'parentPath' | 'position' | 'deletedAt'>

/**
 * iter290 P0 (queue: subtask gap d): siblings 比較。
 * position asc + id asc tie-break で、同 position が race で起こり得ても決定的な順序を保つ。
 */
export function compareSiblings(a: LtreeNode, b: LtreeNode): number {
  const c = a.position.localeCompare(b.position)
  return c !== 0 ? c : a.id.localeCompare(b.id)
}

/**
 * iter290 P0: 同 parentPath の sibling のうち、対象 item の直前 (position 最大の小さい) を返す。
 * 無ければ null (= 先頭なので indent 不可)。
 */
export function findPrevSibling<T extends LtreeNode>(item: T, allItems: readonly T[]): T | null {
  const siblings = allItems
    .filter((i) => !i.deletedAt && i.id !== item.id && i.parentPath === item.parentPath)
    .sort(compareSiblings)
  let prev: T | null = null
  for (const s of siblings) {
    if (compareSiblings(s, item) < 0) prev = s
    else break
  }
  return prev
}

/**
 * iter290 P0: 対象 item の祖父 item (parent の parent) を返す。
 *   - root 直下 (parentPath が 1 segment) → 'root' sentinel (= outdent 後 root 行き)
 *   - parentPath 0 segment (= item 自身が root) → null (outdent 不可)
 *   - 通常 → 2nd-to-last segment の uuidLabel から allItems を逆引き、見つからない時は null
 */
export function findGrandparentId(
  item: LtreeNode,
  allItems: readonly LtreeNode[],
): string | 'root' | null {
  if (item.parentPath === '') return null
  const segs = item.parentPath.split('.')
  if (segs.length === 1) return 'root'
  const grandparentLabel = segs[segs.length - 2]
  const found = allItems.find((i) => !i.deletedAt && uuidToLabel(i.id) === grandparentLabel)
  return found?.id ?? null
}
