/**
 * OKR (Phase 5.2):
 *   - goals (Objective): 期間付き定性目標 (Q1 2026 等)
 *   - key_results (KR): goal に 1..N 紐づく定量指標 (current/target + weight)
 *   - items.key_result_id (item.ts に追加): KR への紐付け (nullable)
 *
 * 進捗計算 (service 層):
 *   - mode='items': KR に紐付いた items の done 比 (default)
 *   - mode='manual': current_value / target_value をユーザが手動更新
 *   - Goal の進捗は KR の weighted average
 */
import { sql } from 'drizzle-orm'
import { check, date, index, numeric, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core'

import { createdByActor, id, mutationMarkers, timestamps } from './_shared'
import { workspaces } from './workspace'

export const goals = pgTable(
  'goals',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    /** 'quarterly' | 'annual' | 'custom' (将来拡張) */
    period: text('period').notNull().default('quarterly'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    /** 'active' | 'completed' | 'archived' */
    status: text('status').notNull().default('active'),
    ...createdByActor,
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [
    index('goals_workspace_status_idx').on(t.workspaceId, t.status),
    check('goals_dates_check', sql`start_date <= end_date`),
    check('goals_status_check', sql`status IN ('active', 'completed', 'archived')`),
  ],
)

export const keyResults = pgTable(
  'key_results',
  {
    id: id(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** 'items' (linked items の done 比) | 'manual' (current/target を直接入力) */
    progressMode: text('progress_mode').notNull().default('items'),
    targetValue: numeric('target_value', { precision: 12, scale: 2 }),
    currentValue: numeric('current_value', { precision: 12, scale: 2 }),
    /** 単位 (例 "%", "件", "M$") — 表示用 */
    unit: text('unit'),
    /** weight: Goal の進捗を出す際の重み付け (1-10、既定 1) */
    weight: smallint('weight').notNull().default(1),
    /** 表示順 */
    position: smallint('position').notNull().default(0),
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [
    index('key_results_goal_idx').on(t.goalId, t.position),
    check('key_results_progress_mode_check', sql`progress_mode IN ('items', 'manual')`),
    check('key_results_weight_check', sql`weight BETWEEN 1 AND 10`),
  ],
)

export type Goal = typeof goals.$inferSelect
export type NewGoal = typeof goals.$inferInsert
export type KeyResult = typeof keyResults.$inferSelect
export type NewKeyResult = typeof keyResults.$inferInsert
