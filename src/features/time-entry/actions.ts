'use server'

import { actionWrap } from '@/lib/action-wrap'
import { type Result } from '@/lib/result'

import type { TimeEntry } from './schema'
import { timeEntryService } from './service'

export async function createTimeEntryAction(input: unknown): Promise<Result<TimeEntry>> {
  return await actionWrap(() => timeEntryService.create(input))
}

export async function listTimeEntriesAction(input: unknown): Promise<Result<TimeEntry[]>> {
  return await actionWrap(() => timeEntryService.list(input))
}

export async function syncTimeEntryAction(input: unknown): Promise<Result<TimeEntry>> {
  return await actionWrap(() => timeEntryService.enqueueSync(input))
}
