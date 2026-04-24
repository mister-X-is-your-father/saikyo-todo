/**
 * 稼働入力 (time_entries) とモック外部タイムシート (mock_timesheet_entries)。
 * spec: docs/spec-time-entries.md
 *
 * time_entries は workspace 内の本体。Playwright worker が
 * mock_timesheet_entries に反映する (本番は実在の外部システム)。
 */
import { sql } from 'drizzle-orm'
import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { authUsers, id, mutationMarkers, timestamps } from './_shared'
import { items } from './item'
import { workspaces } from './workspace'

export const timeEntrySyncStatus = pgEnum('time_entry_sync_status', ['pending', 'synced', 'failed'])

export const timeEntries = pgTable(
  'time_entries',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').references(() => items.id, { onDelete: 'set null' }),
    workDate: date('work_date').notNull(),
    category: text('category').notNull(),
    description: text('description').notNull().default(''),
    durationMinutes: integer('duration_minutes').notNull(),
    syncStatus: timeEntrySyncStatus('sync_status').notNull().default('pending'),
    syncAttempts: integer('sync_attempts').notNull().default(0),
    syncError: text('sync_error'),
    externalRef: text('external_ref'),
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [
    index('time_entries_workspace_date_idx').on(t.workspaceId, t.workDate.desc()),
    // worker がピックする pending のみを対象にする partial index
    index('time_entries_pending_idx')
      .on(t.syncStatus)
      .where(sql`sync_status = 'pending'`),
  ],
)

export const mockTimesheetEntries = pgTable('mock_timesheet_entries', {
  id: id(),
  sessionId: text('session_id').notNull(),
  workDate: date('work_date').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull().default(''),
  hoursDecimal: numeric('hours_decimal', { precision: 4, scale: 2 }).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TimeEntry = typeof timeEntries.$inferSelect
export type NewTimeEntry = typeof timeEntries.$inferInsert
export type MockTimesheetEntry = typeof mockTimesheetEntries.$inferSelect
export type NewMockTimesheetEntry = typeof mockTimesheetEntries.$inferInsert
