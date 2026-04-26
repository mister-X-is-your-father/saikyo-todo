'use server'

import { actionWrap } from '@/lib/action-wrap'
import type { Result } from '@/lib/result'

import type { PersonalPeriodGoal } from './schema'
import { personalPeriodGoalService } from './service'

export async function getPersonalPeriodGoalAction(
  input: unknown,
): Promise<Result<PersonalPeriodGoal | null>> {
  return await actionWrap(() => personalPeriodGoalService.get(input))
}

export async function upsertPersonalPeriodGoalAction(
  input: unknown,
): Promise<Result<PersonalPeriodGoal>> {
  return await actionWrap(() => personalPeriodGoalService.upsert(input))
}
