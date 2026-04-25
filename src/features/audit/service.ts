import 'server-only'

import { and, desc, eq } from 'drizzle-orm'

import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { auditLog } from '@/lib/db/schema'
import { withUserDb } from '@/lib/db/scoped-client'

import { itemRepository } from '@/features/item/repository'

export interface AuditEntryRow {
  id: string
  actorType: 'user' | 'agent'
  actorId: string
  targetType: string
  targetId: string | null
  action: string
  before: unknown
  after: unknown
  ts: Date
}

/**
 * Activity 読み取り。Item 単位 / workspace 単位の両方をサポート。
 * RLS で admin 以上のみ読める。member が呼んだ場合は PermissionError だが
 * UI 側で catch して空配列扱いにしたい用途のため、listByTargetItem は
 * 権限エラー時に空配列を返す。
 */
export const auditService = {
  async listByTargetItem(itemId: string, limit = 50): Promise<AuditEntryRow[]> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, itemId)
      if (!item) return []
      try {
        await requireWorkspaceMember(item.workspaceId, 'admin')
      } catch {
        // member 以下は audit を見られないが空配列で返す (UI fallback)
        return []
      }
      const rows = await tx
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.workspaceId, item.workspaceId),
            eq(auditLog.targetType, 'item'),
            eq(auditLog.targetId, itemId),
          ),
        )
        .orderBy(desc(auditLog.ts))
        .limit(limit)
      return rows as AuditEntryRow[]
    })
  },

  async listByWorkspace(workspaceId: string, limit = 100): Promise<AuditEntryRow[]> {
    const user = await requireUser()
    try {
      await requireWorkspaceMember(workspaceId, 'admin')
    } catch {
      return []
    }
    return await withUserDb(user.id, async (tx) => {
      const rows = await tx
        .select()
        .from(auditLog)
        .where(eq(auditLog.workspaceId, workspaceId))
        .orderBy(desc(auditLog.ts))
        .limit(limit)
      return rows as AuditEntryRow[]
    })
  },
}
