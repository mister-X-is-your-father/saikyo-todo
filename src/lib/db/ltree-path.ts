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
