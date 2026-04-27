/**
 * Phase 6.15 iter152: item-event trigger dispatcher (matcher only)。
 *
 * itemService.create / updateStatus / complete などから item event が発火したら、
 * workspace 内の enabled workflow から `trigger.kind='item-event'` でかつ
 * `trigger.event` と `trigger.filter` が一致するものを抽出して返す。
 *
 * 実 dispatch (runWorkflow 起動) は次 iter で itemService 側に wire する。
 * 本ファイルは matcher だけなので副作用なし、unit test しやすい純関数中心。
 */
import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'

import { workflows } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Item } from '@/features/item/schema'

import type { Workflow } from './schema'

export type ItemEventName = 'create' | 'update' | 'status_change' | 'complete'

interface ItemEventTrigger {
  kind: 'item-event'
  event: ItemEventName
  filter: Record<string, unknown>
}

/**
 * trigger が item-event 型か判定する type guard。
 * jsonb の trigger 列は any なので unknown 経由で型を絞る。
 */
export function isItemEventTrigger(trigger: unknown): trigger is ItemEventTrigger {
  if (!trigger || typeof trigger !== 'object') return false
  const t = trigger as Record<string, unknown>
  return (
    t.kind === 'item-event' &&
    typeof t.event === 'string' &&
    ['create', 'update', 'status_change', 'complete'].includes(t.event)
  )
}

/**
 * filter (例: { isMust: true, status: 'todo' }) と item の各フィールドが
 * 完全一致するか確認する。filter が空なら常に true。
 */
export function itemMatchesFilter(item: Item, filter: Record<string, unknown>): boolean {
  if (!filter || Object.keys(filter).length === 0) return true
  for (const [key, expected] of Object.entries(filter)) {
    const actual = (item as unknown as Record<string, unknown>)[key]
    if (actual !== expected) return false
  }
  return true
}

/**
 * 指定 workspace で event + item にマッチする item-event workflow を取得する。
 * - workflow が enabled
 * - 削除されていない
 * - trigger.kind='item-event' で trigger.event === event
 * - trigger.filter が item にマッチ
 */
export async function findItemEventMatchingWorkflows(
  tx: Tx,
  workspaceId: string,
  event: ItemEventName,
  item: Item,
): Promise<Workflow[]> {
  const rows = await tx
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.workspaceId, workspaceId),
        eq(workflows.enabled, true),
        isNull(workflows.deletedAt),
      ),
    )
  return rows.filter((w) => {
    if (!isItemEventTrigger(w.trigger)) return false
    if (w.trigger.event !== event) return false
    return itemMatchesFilter(item, w.trigger.filter)
  })
}
