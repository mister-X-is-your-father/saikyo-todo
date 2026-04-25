'use server'

import { actionWrap } from '@/lib/action-wrap'
import type { Result } from '@/lib/result'

import type { PmRunOutput } from '@/features/agent/pm-service'

import { retroService } from './retro-service'

export async function runRetroForSprintAction(sprintId: string): Promise<Result<PmRunOutput>> {
  return await actionWrap(() =>
    retroService.runForSprint({ sprintId, idempotencyKey: crypto.randomUUID() }),
  )
}
