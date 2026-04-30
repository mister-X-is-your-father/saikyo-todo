'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { Schedule } from './schema'
import { scheduleService } from './service'

export async function createScheduleAction(input: unknown): Promise<Result<Schedule>> {
  return await actionWrap(() => scheduleService.create(input))
}

export async function updateScheduleAction(input: unknown): Promise<Result<Schedule>> {
  return await actionWrap(() => scheduleService.update(input))
}

export async function moveScheduleAction(input: unknown): Promise<Result<Schedule>> {
  return await actionWrap(() => scheduleService.move(input))
}

export async function softDeleteScheduleAction(input: unknown): Promise<Result<Schedule>> {
  return await actionWrap(() => scheduleService.softDelete(input))
}

export async function startTimerAction(input: unknown): Promise<Result<Schedule>> {
  return await actionWrap(() => scheduleService.startTimer(input))
}

export async function stopTimerAction(input: unknown): Promise<Result<Schedule>> {
  return await actionWrap(() => scheduleService.stopTimer(input))
}

export async function listSchedulesByDateAction(input: {
  workspaceId: string
  date: string
}): Promise<Result<Schedule[]>> {
  try {
    return ok(await scheduleService.listByDate(input))
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
