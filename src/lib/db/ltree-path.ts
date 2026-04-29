/**
 * Pure な LTREE path 計算ヘルパ (DB 非依存)。
 * server-only 制約がないのでテスト可能。
 *
 * items.parent_path は親のフル path を保持する:
 *   root item の parent_path = '' (空 ltree)
 *   root の子 の parent_path = '<root.id のハイフン除去>'
 *   その孫 の parent_path = '<root.id>.<子.id>'
 *
 * UUID のハイフンは PG15 以下の ltree label 制約 ([A-Za-z0-9_]) に違反するため、除去する。
 */

/** UUID をハイフン除去して ltree label に変換 (例: '550e8400-...-000' → '550e8400...000')。 */
export function uuidToLabel(id: string): string {
  return id.replace(/-/g, '')
}

/** item の「フル path」(= この item を親とする子の parent_path に入る値) を算出。 */
export function fullPathOf(parent: { id: string; parentPath: string }): string {
  const label = uuidToLabel(parent.id)
  return parent.parentPath === '' ? label : `${parent.parentPath}.${label}`
}

/**
 * 新 parent の下に置いた時の item の新しい parent_path / フル path を計算。
 * newParentFull が空文字なら item は root に戻る。
 */
export function computeMovedPath(
  item: { id: string },
  newParentFull: string,
): { newParentPath: string; newFullPath: string } {
  const label = uuidToLabel(item.id)
  return {
    newParentPath: newParentFull,
    newFullPath: newParentFull === '' ? label : `${newParentFull}.${label}`,
  }
}

/**
 * iter430 refactor: 「ある item の parentPath が parent のフル path の子孫を表すか」を
 * 1 関数に集約。
 *
 * descendants-progress (iter417) / at-risk-parents (iter427) で同 shape の
 * `parentPath === parentFull || parentPath.startsWith(parentFull + '.')` が
 * 重複していたので集約 (= iter325 / iter330 / ... / iter425 と同じ「同 shape の
 * 散在を 1 file に」方針 29 弾目)。
 *
 * 仕様:
 *   - `itemParentPath === parentFull` (= 直下の子) → true
 *   - `itemParentPath.startsWith(parentFull + '.')` (= 孫以降) → true
 *   - それ以外 → false
 *   - parentFull が空文字 (= root) の場合: '.' で始まる ltree は無いので
 *     `itemParentPath === ''` (= root 直下) のみ true (それ以外の root 直下や
 *     どの parent の子も含まれない、本 helper は root を「parent」として扱わない)
 *   - 純粋関数、副作用なし、O(itemParentPath.length)
 *
 * caller usage:
 *   const parentFull = fullPathOf(parent)
 *   for (const it of items) {
 *     if (isPathDescendantOf(it.parentPath, parentFull)) { ... }
 *   }
 */
export function isPathDescendantOf(itemParentPath: string, parentFull: string): boolean {
  if (itemParentPath === parentFull) return true
  return itemParentPath.startsWith(`${parentFull}.`)
}
