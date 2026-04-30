/**
 * iter (queue: PDCA P-1 substrate): pdca_cycles + pdca_cycle_items schema。
 *
 * 既存 PdcaPanel (status counts の P/D/C/A renaming) を補完する形で、cycle 単位
 * での「仮説 → 実行 → 検証 → 改善」 を first-class entity 化する。
 *
 * 設計詳細は FEEDBACK_QUEUE.md "PDCA mode 抜本再設計" entry 参照。
 *
 * status enum:
 *   - plan: 仮説 / 目標 / 関連 items 設定中
 *   - do:   実行中 (linked items を消化)
 *   - check: 実測 / 学び記録中
 *   - act:  次サイクルへの改善決定中
 *   - closed: 凍結 (history search 対象)
 */
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { authUsers, id, mutationMarkers, timestamps } from './_shared'
import { items } from './item'
import { workspaces } from './workspace'

export const pdcaCycleStatus = pgEnum('pdca_cycle_status', ['plan', 'do', 'check', 'act', 'closed'])
export const pdcaCycleItemRole = pgEnum('pdca_cycle_item_role', ['do', 'reference'])

export const pdcaCycles = pgTable(
  'pdca_cycles',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** Plan: 仮説 (例: 「daily standup を朝→昼に変更で完了率上がる」) */
    hypothesis: text('hypothesis').notNull().default(''),
    /** Plan: 何で測るか (自由記述、例: 「週次完了 item 数」) */
    targetMetric: text('target_metric').notNull().default(''),
    /** Plan: 目標値 (自由記述、例: 「現状 12 → 16」) */
    targetValue: text('target_value').notNull().default(''),
    /** Check: 実測値 (人間 or AI 集計) */
    actualValue: text('actual_value').notNull().default(''),
    /** Check: 学び (markdown) */
    checkFindings: text('check_findings').notNull().default(''),
    /** Act: 次 cycle に持ち越す改善決定 (markdown) */
    actDecisions: text('act_decisions').notNull().default(''),
    status: pdcaCycleStatus('status').notNull().default('plan'),
    /** A → 次 cycle への chain (P-6 で利用) */
    nextCycleId: uuid('next_cycle_id'),

    // 各 phase 打刻
    planStartedAt: timestamp('plan_started_at', { withTimezone: true }),
    planFinishedAt: timestamp('plan_finished_at', { withTimezone: true }),
    doStartedAt: timestamp('do_started_at', { withTimezone: true }),
    doFinishedAt: timestamp('do_finished_at', { withTimezone: true }),
    checkStartedAt: timestamp('check_started_at', { withTimezone: true }),
    checkFinishedAt: timestamp('check_finished_at', { withTimezone: true }),

    ...timestamps,
    ...mutationMarkers,
  },
  (t) => [
    index('pdca_cycles_workspace_status_idx').on(t.workspaceId, t.status),
    index('pdca_cycles_owner_idx').on(t.workspaceId, t.ownerId),
    check(
      'pdca_cycles_phase_order_check',
      sql`(${t.planFinishedAt} is null or ${t.planStartedAt} is null or ${t.planFinishedAt} >= ${t.planStartedAt})
        and (${t.doFinishedAt} is null or ${t.doStartedAt} is null or ${t.doFinishedAt} >= ${t.doStartedAt})
        and (${t.checkFinishedAt} is null or ${t.checkStartedAt} is null or ${t.checkFinishedAt} >= ${t.checkStartedAt})`,
    ),
  ],
)

export const pdcaCycleItems = pgTable(
  'pdca_cycle_items',
  {
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => pdcaCycles.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    /** 'do' = この cycle で消化した item, 'reference' = 参考 item */
    role: pdcaCycleItemRole('role').notNull().default('do'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    addedByUserId: uuid('added_by_user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    sortKey: integer('sort_key').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.cycleId, t.itemId] }),
    index('pdca_cycle_items_item_idx').on(t.itemId),
    index('pdca_cycle_items_cycle_role_idx').on(t.cycleId, t.role),
  ],
)

export type PdcaCycle = typeof pdcaCycles.$inferSelect
export type PdcaCycleInsert = typeof pdcaCycles.$inferInsert
export type PdcaCycleItem = typeof pdcaCycleItems.$inferSelect
export type PdcaCycleItemInsert = typeof pdcaCycleItems.$inferInsert
