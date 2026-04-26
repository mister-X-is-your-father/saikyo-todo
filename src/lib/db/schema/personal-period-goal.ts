/**
 * Phase 6.15 iter108: 個人の日次/週次/月次ゴール (ユーザ要望)。
 * - period: 'day' | 'week' | 'month'
 * - period_key: ISO 表記 ('2026-04-27' / '2026-W18' / '2026-04')
 */
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { authUsers, id } from './_shared'
import { workspaces } from './workspace'

export const personalPeriodGoals = pgTable(
  'personal_period_goals',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    periodKey: text('period_key').notNull(),
    text: text('text').notNull().default(''),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('personal_period_goals_uniq').on(t.workspaceId, t.userId, t.period, t.periodKey),
    index('personal_period_goals_lookup_idx').on(t.workspaceId, t.userId, t.period),
    check('personal_period_goals_period_check', sql`${t.period} in ('day', 'week', 'month')`),
  ],
)

export type PersonalPeriodGoal = typeof personalPeriodGoals.$inferSelect
