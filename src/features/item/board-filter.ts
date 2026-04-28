/**
 * iter295 refactor: ItemsBoard の filter 計算を pure helper に抽出。
 *
 * 元 inline 実装は `items-board.tsx` の `useMemo` 内で 4 種フィルタ
 * (deletedAt 除外 / `must=1` / `status=...` / `sprint=active|none|<id>`) を
 * チェーンしていた。pure 化することで:
 *   - sprintFilter sentinel ('active'/'none'/'<id>') の semantics を test で固定
 *   - 将来 backlog-view / kanban-view 等で再利用 (filter 条件を共通化)
 *   - useMemo deps の変更時に regression を unit test で保証
 *
 * 仕様 (動作変更ゼロ):
 *  - `deletedAt` なし は常に除外
 *  - `must=true` のとき isMust=true のみ
 *  - `statusFilter` 文字列が truthy で `i.status !== statusFilter` は除外
 *  - `sprintFilter`:
 *      - `'active'` → activeSprintId があり、かつ i.sprintId === activeSprintId のみ
 *      - `'none'`   → i.sprintId が falsy (= 未割当) のみ
 *      - 任意 uuid → i.sprintId === sprintFilter のみ
 *      - `null` / `''` / `undefined` → 無条件パス
 */

import type { Item } from './schema'

export interface BoardFilterInput {
  items: readonly Item[]
  must: boolean
  statusFilter: string | null
  sprintFilter: string | null
  /** sprint='active' のときに使う、現在 active な Sprint の id (なければ null) */
  activeSprintId: string | null
}

export function applyBoardFilters(input: BoardFilterInput): Item[] {
  const { items, must, statusFilter, sprintFilter, activeSprintId } = input
  return items.filter((i) => {
    if (i.deletedAt) return false
    if (must && !i.isMust) return false
    if (statusFilter && i.status !== statusFilter) return false
    if (sprintFilter === 'active') {
      if (!activeSprintId || i.sprintId !== activeSprintId) return false
    } else if (sprintFilter === 'none') {
      if (i.sprintId) return false
    } else if (sprintFilter && sprintFilter !== '') {
      if (i.sprintId !== sprintFilter) return false
    }
    return true
  })
}
