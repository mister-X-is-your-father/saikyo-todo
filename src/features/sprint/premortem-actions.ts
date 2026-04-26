'use server'

import { actionWrap } from '@/lib/action-wrap'
import type { Result } from '@/lib/result'

import type { PmRunOutput } from '@/features/agent/pm-service'

import { premortemService } from './premortem-service'

export async function runPremortemForSprintAction(sprintId: string): Promise<Result<PmRunOutput>> {
  return await actionWrap(() =>
    premortemService.runForSprint({ sprintId, idempotencyKey: crypto.randomUUID() }),
  )
}
