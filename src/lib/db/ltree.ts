/**
 * Item ツリー (LTREE) 操作ヘルパ。
 * ARCHITECTURE §7.2 / CLAUDE.md の「ツリー操作は lib/db/ltree.ts に集約」に従う。
 *
 * 前提:
 * - items.parent_path は親のフル path (root item は空 ltree)
 * - ltree の label は ハイフン除去 UUID (32 hex chars)
 * - move 操作は `SELECT ... FOR UPDATE` + 一括 UPDATE で race-free
 *
 * Pure 計算は `./ltree-path.ts` に分離 (テスト可能性のため)。
 */
import 'server-only'

import { sql } from 'drizzle-orm'

import { NotFoundError, ValidationError } from '../errors'
import { fullPathOf, uuidToLabel } from './ltree-path'
import type { Tx } from './scoped-client'

export { computeMovedPath, fullPathOf, uuidToLabel } from './ltree-path'

type ItemPathRow = {
  id: string
  parent_path: string
  [key: string]: unknown
}

/**
 * 対象 item と全子孫を `FOR UPDATE` でロック。対象が存在しなければ null。
 * 戻り値は対象 item の { id, parentPath } (自身の parent_path のみ。フル path は fullPathOf で算出)。
 */
export async function lockSubtree(
  tx: Tx,
  itemId: string,
): Promise<{ id: string; parentPath: string } | null> {
  const target = await tx.execute<ItemPathRow>(sql`
    SELECT id, parent_path::text AS parent_path
    FROM items
    WHERE id = ${itemId} AND deleted_at IS NULL
    FOR UPDATE
  `)
  const row = target[0]
  if (!row) return null
  const targetFull = fullPathOf({ id: row.id, parentPath: row.parent_path })
  // 子孫もロック (parent_path が target のフル path で始まる行)
  await tx.execute(sql`
    SELECT id FROM items
    WHERE parent_path <@ ${targetFull}::ltree AND deleted_at IS NULL
    FOR UPDATE
  `)
  return { id: row.id, parentPath: row.parent_path }
}

/**
 * item 自身 + 全子孫を取得 (parent_path 順)。
 * 削除済みは除外。service 層の list ガードを前提 (workspace_id チェックは呼び出し側)。
 */
export async function findDescendants(tx: Tx, itemId: string): Promise<ItemPathRow[]> {
  const targetRows = await tx.execute<ItemPathRow>(sql`
    SELECT id, parent_path::text AS parent_path
    FROM items WHERE id = ${itemId} AND deleted_at IS NULL
  `)
  const target = targetRows[0]
  if (!target) return []
  const targetFull = fullPathOf({ id: target.id, parentPath: target.parent_path })
  const rows = await tx.execute<ItemPathRow>(sql`
    SELECT id, parent_path::text AS parent_path
    FROM items
    WHERE (id = ${itemId} OR parent_path <@ ${targetFull}::ltree)
      AND deleted_at IS NULL
    ORDER BY parent_path, created_at
  `)
  return rows
}

/**
 * item subtree を新しい親の下に移動 (自分 + 全子孫の parent_path を一括 UPDATE)。
 * newParentItemId = null の場合は root へ移動。
 *
 * 検証:
 *   - 対象が存在しない → NotFoundError
 *   - newParentItemId が自分自身または自分の子孫 → ValidationError
 *   - 新 parent が同 workspace でない: RLS/呼び出し側で担保 (ここではチェックしない)
 *
 * race-free: 対象 subtree 全体を FOR UPDATE でロックしてから UPDATE。
 */
export async function moveSubtree(
  tx: Tx,
  itemId: string,
  newParentItemId: string | null,
): Promise<void> {
  const target = await lockSubtree(tx, itemId)
  if (!target) throw new NotFoundError('移動対象の Item が見つかりません')
  const targetFull = fullPathOf({ id: target.id, parentPath: target.parentPath })

  let newParentFull = ''
  if (newParentItemId !== null) {
    if (newParentItemId === itemId) {
      throw new ValidationError('自分自身の下には移動できません')
    }
    const rows = await tx.execute<ItemPathRow>(sql`
      SELECT id, parent_path::text AS parent_path
      FROM items
      WHERE id = ${newParentItemId} AND deleted_at IS NULL
      FOR UPDATE
    `)
    const np = rows[0]
    if (!np) throw new NotFoundError('新 parent Item が見つかりません')
    newParentFull = fullPathOf({ id: np.id, parentPath: np.parent_path })
    // 自己ループ検知: 新 parent のフル path が target のフル path と等しい/子孫なら NG
    const loopRows = await tx.execute<{ loop: boolean; [key: string]: unknown }>(sql`
      SELECT (${newParentFull}::ltree <@ ${targetFull}::ltree) AS loop
    `)
    if (loopRows[0]?.loop) {
      throw new ValidationError('自身または子孫には移動できません')
    }
  }

  const targetLabel = uuidToLabel(target.id)
  const newTargetFull = newParentFull === '' ? targetLabel : `${newParentFull}.${targetLabel}`

  // target 自身 + 子孫を一括 UPDATE。3 分岐:
  //   target 自身 (id = $itemId): parent_path = newParentFull
  //   直接の子 (parent_path = targetFull): parent_path = newTargetFull
  //   孫以降 (parent_path は targetFull で始まり, level > nlevel(targetFull)):
  //     parent_path = newTargetFull || subpath(parent_path, nlevel(targetFull))
  //
  // 直接の子を別枝にしているのは PG15 以下で subpath(x, nlevel(x)) が
  // "invalid positions" を投げるため (offset == nlevel は empty を返すべきだが実装が guard する)。
  await tx.execute(sql`
    UPDATE items
    SET parent_path = CASE
      WHEN id = ${itemId} THEN ${newParentFull}::ltree
      WHEN parent_path = ${targetFull}::ltree THEN ${newTargetFull}::ltree
      ELSE ${newTargetFull}::ltree || subpath(parent_path, nlevel(${targetFull}::ltree))
    END,
    version = version + 1,
    updated_at = now()
    WHERE (id = ${itemId} OR parent_path <@ ${targetFull}::ltree)
      AND deleted_at IS NULL
  `)
}

/**
 * root の下に item を挿入する場合の parent_path (= '') を返す helper。
 * 非 root に入れる場合は fullPathOf(parent) を使う。
 */
export function parentPathForInsertUnder(
  parent: { id: string; parentPath: string } | null,
): string {
  if (parent === null) return ''
  return fullPathOf(parent)
}
