/**
 * Sprint: workspace ごとの期間付き作業単位 (1-4 週推奨、自由)。
 *
 * - status: planning → active → completed (戻し可) / cancelled
 * - 同 workspace で active は **1 つまで** (partial unique index で DB 強制)
 * - 期間は `start_date <= end_date` (CHECK)
 * - items.sprint_id で割り当て (item.ts に追加、nullable FK)
 * - audit_log: 生成 / status 変更 / 削除を記録
 * - soft delete: status='cancelled' へ。物理削除はしない
 *   (deleted_at は agent / template と異なり置かない — status で表現)
 */
import { sql } from 'drizzle-orm'
import { check, date, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { createdByActor, id, mutationMarkers, timestamps } from './_shared'
import { workspaces } from './workspace'

export const sprints = pgTable(
  'sprints',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    goal: text('goal'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: text('status').notNull().default('planning'),
    ...createdByActor,
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [
    index('sprints_workspace_status_idx').on(t.workspaceId, t.status),
    index('sprints_workspace_dates_idx').on(t.workspaceId, t.startDate, t.endDate),
    // 同 workspace で active は 1 つだけ (partial unique)
    uniqueIndex('sprints_active_uniq')
      .on(t.workspaceId)
      .where(sql`status = 'active'`),
    check('sprints_dates_check', sql`start_date <= end_date`),
    check('sprints_status_check', sql`status IN ('planning', 'active', 'completed', 'cancelled')`),
  ],
)

export type Sprint = typeof sprints.$inferSelect
export type NewSprint = typeof sprints.$inferInsert
