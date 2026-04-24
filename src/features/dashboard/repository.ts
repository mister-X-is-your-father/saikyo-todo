import 'server-only'

import { and, asc, eq, isNull, sql } from 'drizzle-orm'

import { items, workspaceSettings, workspaceStatuses } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Item } from '@/features/item/schema'

export const dashboardRepository = {
  /** MUST item 全件 (deleted 除外、due_date asc nulls last → position asc)。 */
  async listMustItems(tx: Tx, workspaceId: string): Promise<Item[]> {
    const rows = await tx
      .select()
      .from(items)
      .where(
        and(eq(items.workspaceId, workspaceId), eq(items.isMust, true), isNull(items.deletedAt)),
      )
      .orderBy(
        sql`${items.dueDate} is null`, // nulls last (false first)
        asc(items.dueDate),
        asc(items.position),
      )
    return rows as Item[]
  },

  /** workspace_settings.wip_limit_must。行が無ければ null を返す。 */
  async findWipLimit(tx: Tx, workspaceId: string): Promise<number | null> {
    const [row] = await tx
      .select({ v: workspaceSettings.wipLimitMust })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1)
    return row ? row.v : null
  },

  /**
   * 現在 in_progress type の status に紐づく MUST item 数。
   * workspace_statuses.type で集計 (status key は workspace ごとに可変なので join 必須)。
   */
  async countMustInProgress(tx: Tx, workspaceId: string): Promise<number> {
    const [row] = await tx
      .select({ c: sql<number>`count(*)::int` })
      .from(items)
      .innerJoin(
        workspaceStatuses,
        and(
          eq(workspaceStatuses.workspaceId, items.workspaceId),
          eq(workspaceStatuses.key, items.status),
        ),
      )
      .where(
        and(
          eq(items.workspaceId, workspaceId),
          eq(items.isMust, true),
          isNull(items.deletedAt),
          eq(workspaceStatuses.type, 'in_progress'),
        ),
      )
    return row?.c ?? 0
  },

  /**
   * 未完了 (done type でない) かつ due_date 範囲に入る MUST item 数。
   * @param lo  下限 (inclusive, 'YYYY-MM-DD')、null で下限なし
   * @param hi  上限 (inclusive, 'YYYY-MM-DD')、null で上限なし
   */
  async countOpenMustByDueRange(
    tx: Tx,
    workspaceId: string,
    lo: string | null,
    hi: string | null,
  ): Promise<number> {
    const conds = [
      eq(items.workspaceId, workspaceId),
      eq(items.isMust, true),
      isNull(items.deletedAt),
      isNull(items.doneAt),
    ]
    if (lo) conds.push(sql`${items.dueDate} >= ${lo}`)
    if (hi) conds.push(sql`${items.dueDate} <= ${hi}`)
    conds.push(sql`${items.dueDate} is not null`)
    const [row] = await tx
      .select({ c: sql<number>`count(*)::int` })
      .from(items)
      .where(and(...conds))
    return row?.c ?? 0
  },

  /**
   * Burndown series: 直近 days 日分の (date, open, closed)。
   * generate_series で日付を埋めて、items を CROSS JOIN + FILTER で集計する。
   */
  async getBurndownSeries(
    tx: Tx,
    workspaceId: string,
    days: number,
  ): Promise<Array<{ date: string; open: number; closed: number }>> {
    const rows = await tx.execute<{ date: string; open: number; closed: number }>(sql`
      with days as (
        select generate_series(
          (current_date - (${days}::int - 1) * interval '1 day')::date,
          current_date,
          interval '1 day'
        )::date as d
      )
      select
        to_char(d.d, 'YYYY-MM-DD') as date,
        coalesce(count(*) filter (
          where i.created_at::date <= d.d
            and (i.done_at is null or i.done_at::date > d.d)
            and (i.deleted_at is null or i.deleted_at::date > d.d)
        ), 0)::int as open,
        coalesce(count(*) filter (
          where i.done_at is not null
            and i.done_at::date <= d.d
            and i.created_at::date <= d.d
            and (i.deleted_at is null or i.deleted_at::date > d.d)
        ), 0)::int as closed
      from days d
      left join ${items} i
        on i.workspace_id = ${workspaceId}::uuid and i.is_must = true
      group by d.d
      order by d.d asc
    `)
    // postgres-js returns rows as an iterable; normalize to array
    return Array.from(rows) as Array<{ date: string; open: number; closed: number }>
  },
}
