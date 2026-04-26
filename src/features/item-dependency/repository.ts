import 'server-only'

import { and, eq, inArray, isNull, or } from 'drizzle-orm'

import { itemDependencies, items } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { ItemDependencyRow, ItemDependencyType, ItemRef } from './schema'

export const itemDependencyRepository = {
  async insert(
    tx: Tx,
    values: { fromItemId: string; toItemId: string; type: ItemDependencyType },
  ): Promise<ItemDependencyRow> {
    const [row] = await tx.insert(itemDependencies).values(values).onConflictDoNothing().returning()
    if (!row) {
      // 既に同じ row があった (PK 衝突) → idempotent に既存を返す
      const [existing] = await tx
        .select()
        .from(itemDependencies)
        .where(
          and(
            eq(itemDependencies.fromItemId, values.fromItemId),
            eq(itemDependencies.toItemId, values.toItemId),
            eq(itemDependencies.type, values.type),
          ),
        )
        .limit(1)
      if (!existing) throw new Error('insertItemDependency returned no row')
      return existing as ItemDependencyRow
    }
    return row as ItemDependencyRow
  },

  async remove(
    tx: Tx,
    values: { fromItemId: string; toItemId: string; type: ItemDependencyType },
  ): Promise<boolean> {
    const removed = await tx
      .delete(itemDependencies)
      .where(
        and(
          eq(itemDependencies.fromItemId, values.fromItemId),
          eq(itemDependencies.toItemId, values.toItemId),
          eq(itemDependencies.type, values.type),
        ),
      )
      .returning({ from: itemDependencies.fromItemId })
    return removed.length > 0
  },

  /**
   * itemId を起点 (from / to のいずれか) とする依存を全部返す。
   */
  async listForItem(tx: Tx, itemId: string): Promise<ItemDependencyRow[]> {
    const rows = await tx
      .select()
      .from(itemDependencies)
      .where(or(eq(itemDependencies.fromItemId, itemId), eq(itemDependencies.toItemId, itemId)))
    return rows as ItemDependencyRow[]
  },

  /**
   * type='blocks' の有向グラフで、`fromItemId -> toItemId` を新規追加したとき
   * 循環ができるかを判定する。BFS で `toItemId` から下流を辿って `fromItemId` に
   * 戻ってきたら循環。
   */
  async wouldCreateCycle(tx: Tx, fromItemId: string, toItemId: string): Promise<boolean> {
    if (fromItemId === toItemId) return true
    const visited = new Set<string>([toItemId])
    let frontier = [toItemId]
    // 安全弁。ws の依存は普通 1000 件未満で済むため、上限を広めに取る
    for (let depth = 0; depth < 32 && frontier.length > 0; depth++) {
      const next = await tx
        .select({ to: itemDependencies.toItemId })
        .from(itemDependencies)
        .where(
          and(inArray(itemDependencies.fromItemId, frontier), eq(itemDependencies.type, 'blocks')),
        )
      const newFrontier: string[] = []
      for (const r of next) {
        if (r.to === fromItemId) return true
        if (!visited.has(r.to)) {
          visited.add(r.to)
          newFrontier.push(r.to)
        }
      }
      frontier = newFrontier
    }
    return false
  },

  /**
   * 複数 Item の依存関係を一括取得 (Pre-mortem の集計用)。
   * Sprint 全体の blocks グラフを 1 回のクエリで引く。
   */
  async listForItems(tx: Tx, itemIds: string[]): Promise<ItemDependencyRow[]> {
    if (itemIds.length === 0) return []
    const rows = await tx
      .select()
      .from(itemDependencies)
      .where(
        or(
          inArray(itemDependencies.fromItemId, itemIds),
          inArray(itemDependencies.toItemId, itemIds),
        ),
      )
    return rows as ItemDependencyRow[]
  },

  /**
   * Workspace 横断の blocks 依存を全部取得 (Gantt 全体描画 / critical path 計算用)。
   * RLS 経由で呼ぶと自分が member の ws の依存だけ見える。type='blocks' のみ返す。
   */
  async listBlocksForWorkspace(
    tx: Tx,
    workspaceId: string,
  ): Promise<Array<{ fromItemId: string; toItemId: string }>> {
    // workspaceId は items 経由で確認 (item_dependencies に直接 ws_id が無い)
    const rows = await tx
      .select({
        fromItemId: itemDependencies.fromItemId,
        toItemId: itemDependencies.toItemId,
      })
      .from(itemDependencies)
      .innerJoin(items, eq(items.id, itemDependencies.fromItemId))
      .where(
        and(
          eq(items.workspaceId, workspaceId),
          isNull(items.deletedAt),
          eq(itemDependencies.type, 'blocks'),
        ),
      )
    return rows
  },

  async fetchItemRefs(tx: Tx, itemIds: string[]): Promise<Map<string, ItemRef>> {
    if (itemIds.length === 0) return new Map()
    const rows = await tx
      .select({
        id: items.id,
        title: items.title,
        status: items.status,
        isMust: items.isMust,
        doneAt: items.doneAt,
        priority: items.priority,
      })
      .from(items)
      .where(and(inArray(items.id, itemIds), isNull(items.deletedAt)))
    const map = new Map<string, ItemRef>()
    for (const r of rows) map.set(r.id, r as ItemRef)
    return map
  },
}
