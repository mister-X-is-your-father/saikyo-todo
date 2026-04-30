import 'server-only'

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

import type { ActorType } from '@/lib/audit'
import { itemAssignees, items, itemTags, tags, workspaceStatuses } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Item } from './schema'

export interface AssigneeRef {
  actorType: ActorType
  actorId: string
}

export interface ListItemsFilter {
  workspaceId: string
  status?: string
  isMust?: boolean
  limit?: number
}

export const itemRepository = {
  async insert(tx: Tx, values: typeof items.$inferInsert): Promise<Item> {
    const [row] = await tx.insert(items).values(values).returning()
    if (!row) throw new Error('insertItem returned no row')
    return row as Item
  },

  async findById(tx: Tx, id: string): Promise<Item | null> {
    const rows = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, id), isNull(items.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as Item | null
  },

  async list(tx: Tx, filter: ListItemsFilter): Promise<Item[]> {
    const conds = [eq(items.workspaceId, filter.workspaceId), isNull(items.deletedAt)]
    if (filter.status) conds.push(eq(items.status, filter.status))
    if (filter.isMust !== undefined) conds.push(eq(items.isMust, filter.isMust))
    const rows = await tx
      .select()
      .from(items)
      .where(and(...conds))
      .orderBy(desc(items.isMust), asc(items.position), asc(items.createdAt))
      .limit(filter.limit ?? 500)
    return rows as Item[]
  },

  /**
   * 楽観ロック: WHERE id = ? AND version = ? で更新。0 行更新ならロック衝突。
   * 戻り値は更新後の row、衝突なら null。
   */
  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof items.$inferInsert>,
  ): Promise<Item | null> {
    const [row] = await tx
      .update(items)
      .set({
        ...patch,
        version: sql`${items.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, id), eq(items.version, expectedVersion), isNull(items.deletedAt)))
      .returning()
    return (row ?? null) as Item | null
  },

  /** Soft delete (deleted_at をセット)。楽観ロック付き。 */
  async softDelete(tx: Tx, id: string, expectedVersion: number): Promise<Item | null> {
    return await this.updateWithLock(tx, id, expectedVersion, { deletedAt: new Date() })
  },

  /**
   * sibling (同 workspace + 同 parentPath) の max(position) を返す。空なら null。
   * 新規 child 作成時の position 計算に使う (positionBetween(maxPos, null) で末尾追加)。
   *
   * `items.parent_path` は LTREE notNull default `''` で、root 階層は空 ltree
   * (NULL ではない)。呼び出し側は root なら `''` を渡すこと。null は内部で `''`
   * に正規化する (歴史的経緯への安全弁)。
   */
  async findMaxPositionAmongSiblings(
    tx: Tx,
    workspaceId: string,
    parentPath: string | null,
  ): Promise<string | null> {
    const normalizedPath = parentPath ?? ''
    const [row] = await tx
      .select({ position: items.position })
      .from(items)
      .where(
        and(
          eq(items.workspaceId, workspaceId),
          eq(items.parentPath, normalizedPath),
          isNull(items.deletedAt),
        ),
      )
      .orderBy(desc(items.position))
      .limit(1)
    return row?.position ?? null
  },

  /** workspace_statuses.type を返す。存在しない key なら null。 */
  async findStatusType(
    tx: Tx,
    workspaceId: string,
    key: string,
  ): Promise<'todo' | 'in_progress' | 'done' | null> {
    const [row] = await tx
      .select({ type: workspaceStatuses.type })
      .from(workspaceStatuses)
      .where(and(eq(workspaceStatuses.workspaceId, workspaceId), eq(workspaceStatuses.key, key)))
      .limit(1)
    return (row?.type as 'todo' | 'in_progress' | 'done' | undefined) ?? null
  },

  /** workspace 内で type='done' の先頭 status key を返す (order 昇順)。 */
  async findDoneStatusKey(tx: Tx, workspaceId: string): Promise<string | null> {
    const [row] = await tx
      .select({ key: workspaceStatuses.key })
      .from(workspaceStatuses)
      .where(
        and(eq(workspaceStatuses.workspaceId, workspaceId), eq(workspaceStatuses.type, 'done')),
      )
      .limit(1)
    return row?.key ?? null
  },

  /** workspace 内で type='todo' の先頭 status key を返す。 */
  async findTodoStatusKey(tx: Tx, workspaceId: string): Promise<string | null> {
    const [row] = await tx
      .select({ key: workspaceStatuses.key })
      .from(workspaceStatuses)
      .where(
        and(eq(workspaceStatuses.workspaceId, workspaceId), eq(workspaceStatuses.type, 'todo')),
      )
      .limit(1)
    return row?.key ?? null
  },

  /** Item の assignees を取得 (actor_type / actor_id ペア)。 */
  async listAssignees(tx: Tx, itemId: string): Promise<AssigneeRef[]> {
    const rows = await tx
      .select({ actorType: itemAssignees.actorType, actorId: itemAssignees.actorId })
      .from(itemAssignees)
      .where(eq(itemAssignees.itemId, itemId))
    return rows as AssigneeRef[]
  },

  /**
   * iter474: sprint 配下 items の assignees を 1 query で bulk fetch。
   * sprint swim-lane / member-capacity UI の N+1 query 回避用。RLS で
   * 見えない items は inner join で結果から落ちるので情報漏洩なし。
   */
  async listAssigneesForSprintItems(
    tx: Tx,
    sprintId: string,
  ): Promise<Array<{ itemId: string; actorType: ActorType; actorId: string }>> {
    const rows = await tx
      .select({
        itemId: itemAssignees.itemId,
        actorType: itemAssignees.actorType,
        actorId: itemAssignees.actorId,
      })
      .from(itemAssignees)
      .innerJoin(items, eq(itemAssignees.itemId, items.id))
      .where(and(eq(items.sprintId, sprintId), isNull(items.deletedAt)))
    return rows as Array<{ itemId: string; actorType: ActorType; actorId: string }>
  },

  /** Item の assignees を置換。差分 insert/delete。 */
  async setAssignees(tx: Tx, itemId: string, next: AssigneeRef[]): Promise<AssigneeRef[]> {
    await tx.delete(itemAssignees).where(eq(itemAssignees.itemId, itemId))
    if (next.length > 0) {
      await tx.insert(itemAssignees).values(
        next.map((a) => ({
          itemId,
          actorType: a.actorType,
          actorId: a.actorId,
        })),
      )
    }
    return next
  },

  /** Item の tag_id 一覧。 */
  async listTagIds(tx: Tx, itemId: string): Promise<string[]> {
    const rows = await tx
      .select({ tagId: itemTags.tagId })
      .from(itemTags)
      .where(eq(itemTags.itemId, itemId))
    return rows.map((r) => r.tagId)
  },

  /** Item の tags を置換。 */
  async setTags(tx: Tx, itemId: string, tagIds: string[]): Promise<string[]> {
    await tx.delete(itemTags).where(eq(itemTags.itemId, itemId))
    if (tagIds.length > 0) {
      await tx.insert(itemTags).values(
        tagIds.map((tagId) => ({
          itemId,
          tagId,
        })),
      )
    }
    return tagIds
  },

  /** 指定した tagId 群が同じ workspace に属しているかチェック。 */
  async tagsBelongToWorkspace(tx: Tx, workspaceId: string, tagIds: string[]): Promise<boolean> {
    if (tagIds.length === 0) return true
    const rows = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.workspaceId, workspaceId), inArray(tags.id, tagIds)))
    return rows.length === tagIds.length
  },
}
