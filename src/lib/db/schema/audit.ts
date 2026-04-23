/**
 * Audit Log: 全 mutation を記録 (Service 層から recordAudit 経由)。
 * actor は user / agent を区別、before / after は diff。
 */
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { actorType, id } from './_shared'
import { workspaces } from './workspace'

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    actorType: actorType('actor_type').notNull(),
    actorId: uuid('actor_id').notNull(),
    targetType: text('target_type').notNull(), // 'item' | 'doc' | 'comment' | 'template' | ...
    targetId: uuid('target_id'),
    action: text('action').notNull(), // 'create' | 'update' | 'delete' | 'status_change' | ...
    before: jsonb('before'),
    after: jsonb('after'),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_log_workspace_ts_idx').on(t.workspaceId, t.ts),
    index('audit_log_target_idx').on(t.targetType, t.targetId),
  ],
)

export type AuditLog = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert
