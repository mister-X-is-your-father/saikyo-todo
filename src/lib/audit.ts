import 'server-only'

import { auditLog } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

export type ActorType = 'user' | 'agent'

export interface AuditEntry {
  workspaceId: string
  actorType: ActorType
  actorId: string
  targetType: string // 'item' | 'doc' | 'comment' | 'template' | 'workspace' | ...
  targetId?: string
  action: string // 'create' | 'update' | 'delete' | 'archive' | 'status_change' | ...
  before?: unknown
  after?: unknown
}

/**
 * Service 層から mutation のたびに呼ぶ。失敗すると tx ごと rollback (= mutation も無かったことに)。
 */
export async function recordAudit(tx: Tx, entry: AuditEntry): Promise<void> {
  await tx.insert(auditLog).values({
    workspaceId: entry.workspaceId,
    actorType: entry.actorType,
    actorId: entry.actorId,
    targetType: entry.targetType,
    targetId: entry.targetId,
    action: entry.action,
    before: (entry.before ?? null) as never,
    after: (entry.after ?? null) as never,
  })
}
