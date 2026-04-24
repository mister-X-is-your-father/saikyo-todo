'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ValidationError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import { mockTimesheetService } from './service'

const COOKIE_NAME = 'mock_timesheet_session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8h

export async function mockLoginAction(input: unknown): Promise<Result<void>> {
  const r = await mockTimesheetService.login(input)
  if (!r.ok) return err(r.error)
  const store = await cookies()
  store.set(COOKIE_NAME, r.value.sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/mock-timesheet',
    maxAge: COOKIE_MAX_AGE,
  })
  redirect('/mock-timesheet/new')
}

export async function mockLogoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
  redirect('/mock-timesheet/login')
}

export async function mockSubmitAction(
  input: unknown,
): Promise<Result<{ entryId: string; externalRef: string }>> {
  const store = await cookies()
  const sessionId = store.get(COOKIE_NAME)?.value
  if (!sessionId) return err(new ValidationError('ログインが必要です'))
  return await mockTimesheetService.submit(sessionId, input)
}

export async function getMockSessionId(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value ?? null
}
