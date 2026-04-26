import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'

import { personalPeriodGoals } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { PersonalPeriodGoal } from './schema'

export const personalPeriodGoalRepository = {
  async findOne(
    tx: Tx,
    args: { workspaceId: string; userId: string; period: string; periodKey: string },
  ): Promise<PersonalPeriodGoal | null> {
    const rows = await tx
      .select()
      .from(personalPeriodGoals)
      .where(
        and(
          eq(personalPeriodGoals.workspaceId, args.workspaceId),
          eq(personalPeriodGoals.userId, args.userId),
          eq(personalPeriodGoals.period, args.period),
          eq(personalPeriodGoals.periodKey, args.periodKey),
          isNull(personalPeriodGoals.deletedAt),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  },

  async insert(
    tx: Tx,
    values: {
      workspaceId: string
      userId: string
      period: string
      periodKey: string
      text: string
    },
  ): Promise<PersonalPeriodGoal> {
    const [row] = await tx.insert(personalPeriodGoals).values(values).returning()
    if (!row) throw new Error('insert returned no row')
    return row
  },

  /** 楽観ロック update — 0 行更新なら null (= conflict) */
  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    text: string,
  ): Promise<PersonalPeriodGoal | null> {
    const [row] = await tx
      .update(personalPeriodGoals)
      .set({ text, version: expectedVersion + 1 })
      .where(and(eq(personalPeriodGoals.id, id), eq(personalPeriodGoals.version, expectedVersion)))
      .returning()
    return row ?? null
  },
}
