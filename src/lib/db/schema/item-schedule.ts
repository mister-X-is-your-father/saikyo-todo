/**
 * item_schedules: タイムライン上の "スロット" を表す。
 * 1 task : N slot (= 朝 60m + 午後 30m のような分割が可能)。
 * kind:
 *   - 'planned' = 想定 (見積もり)
 *   - 'actual'  = 実測 (実際にやった)
 * itemId が NULL の actual スロット = "割込み" / "休憩" 等、task 紐付け無し。
 *
 * Calendar view (二車線: 左=planned / 右=actual) のソース。
 * 既存 time_entries は durationMinutes ベースで時刻軸を持たないため、
 * timeline 描画には不適。本 table が時刻軸の正となる。
 */
import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { authUsers, id, mutationMarkers, timestamps } from './_shared'
import { items } from './item'
import { workspaces } from './workspace'

export const itemSchedules = pgTable(
  'item_schedules',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').references(() => items.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: ['planned', 'actual'] }).notNull(),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    note: text('note'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [
    index('item_schedules_ws_start_idx').on(t.workspaceId, t.startAt),
    index('item_schedules_item_kind_idx')
      .on(t.itemId, t.kind)
      .where(sql`item_id is not null and deleted_at is null`),
    check('item_schedules_end_after_start', sql`${t.endAt} > ${t.startAt}`),
    check('item_schedules_kind_valid', sql`${t.kind} in ('planned','actual')`),
  ],
)

export type ItemSchedule = typeof itemSchedules.$inferSelect
export type NewItemSchedule = typeof itemSchedules.$inferInsert
