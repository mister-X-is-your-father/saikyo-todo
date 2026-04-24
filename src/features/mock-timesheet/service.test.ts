/**
 * mockTimesheetService integration test.
 * adminDb 経由で mock_timesheet_entries に書く (RLS 無し)。
 */
import { inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { mockTimesheetEntries } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { getMockCredentials, mockTimesheetService } from './service'

describe('mockTimesheetService', () => {
  const insertedIds: string[] = []

  afterAll(async () => {
    if (insertedIds.length === 0) return
    await adminDb
      .delete(mockTimesheetEntries)
      .where(inArray(mockTimesheetEntries.id, insertedIds))
      .catch(() => {})
  })

  describe('login', () => {
    it('正しい credential でログインできる', async () => {
      const { email, password } = getMockCredentials()
      const r = await mockTimesheetService.login({ email, password })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.sessionId).toBe(email)
    })

    it('間違った password で失敗', async () => {
      const { email } = getMockCredentials()
      const r = await mockTimesheetService.login({ email, password: 'wrong' })
      expect(r.ok).toBe(false)
    })
  })

  describe('submit', () => {
    it('正しい入力で insert できる', async () => {
      const r = await mockTimesheetService.submit('ops@example.com', {
        workDate: '2026-04-24',
        category: 'dev',
        description: 'テスト',
        hoursDecimal: 1.5,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      insertedIds.push(r.value.entryId)
      expect(r.value.entryId).toMatch(/^[0-9a-f-]{36}$/)
      expect(r.value.externalRef).toBe(r.value.entryId)
    })

    it('セッション無しは ValidationError', async () => {
      const r = await mockTimesheetService.submit('', {
        workDate: '2026-04-24',
        category: 'dev',
        description: '',
        hoursDecimal: 1,
      })
      expect(r.ok).toBe(false)
    })

    it('不正カテゴリは弾く', async () => {
      const r = await mockTimesheetService.submit('ops@example.com', {
        workDate: '2026-04-24',
        category: 'invalid' as never,
        description: '',
        hoursDecimal: 1,
      })
      expect(r.ok).toBe(false)
    })

    it('hoursDecimal 0.25 刻みでない値は弾く', async () => {
      const r = await mockTimesheetService.submit('ops@example.com', {
        workDate: '2026-04-24',
        category: 'dev',
        description: '',
        hoursDecimal: 0.3,
      })
      expect(r.ok).toBe(false)
    })
  })

  describe('list', () => {
    it('submit 済みを降順で引ける', async () => {
      const r = await mockTimesheetService.list('ops@example.com', 10)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.length).toBeGreaterThanOrEqual(1)
    })
  })
})
