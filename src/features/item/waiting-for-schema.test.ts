import { describe, expect, it } from 'vitest'

import { WaitingForStateSchema } from './schema'

describe('WaitingForStateSchema', () => {
  // 注: zod 4 の uuid validator は version 1-8 のみ accept (13 桁目)。
  // 全 0 (nil) と全 f (max) は特例で許容、それ以外は valid UUID 形式必須。
  const baseInternal = {
    kind: 'internal' as const,
    targetUserId: '11111111-1111-4111-8111-111111111111',
    targetLabel: '田中さん',
    requestedAt: '2026-05-19T09:00:00.000Z',
  }

  const baseExternal = {
    kind: 'external' as const,
    targetContactId: '22222222-2222-4222-8222-222222222222',
    targetLabel: '山田さん (Acme)',
    requestedAt: '2026-05-19T09:00:00.000Z',
  }

  it('internal kind: targetUserId 必須、accept', () => {
    expect(WaitingForStateSchema.safeParse(baseInternal).success).toBe(true)
  })

  it('internal kind: targetUserId 無しは reject', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { targetUserId, ...without } = baseInternal
    const r = WaitingForStateSchema.safeParse(without)
    expect(r.success).toBe(false)
  })

  it('external kind: targetContactId 必須、accept', () => {
    expect(WaitingForStateSchema.safeParse(baseExternal).success).toBe(true)
  })

  it('external kind: targetContactId 無しは reject', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { targetContactId, ...without } = baseExternal
    const r = WaitingForStateSchema.safeParse(without)
    expect(r.success).toBe(false)
  })

  it('reminderCadenceDays / lastRemindedAt / slackChannelId / note は optional', () => {
    expect(
      WaitingForStateSchema.safeParse({
        ...baseInternal,
        reminderCadenceDays: 3,
        lastRemindedAt: '2026-05-22T09:00:00.000Z',
        slackChannelId: 'C01234ABCDE',
        note: 'PR review お願いします',
      }).success,
    ).toBe(true)
  })

  it('reminderCadenceDays は 1-365 範囲外を reject', () => {
    expect(
      WaitingForStateSchema.safeParse({ ...baseInternal, reminderCadenceDays: 0 }).success,
    ).toBe(false)
    expect(
      WaitingForStateSchema.safeParse({ ...baseInternal, reminderCadenceDays: 400 }).success,
    ).toBe(false)
  })

  it('requestedAt が ISO datetime でない時は reject', () => {
    expect(
      WaitingForStateSchema.safeParse({ ...baseInternal, requestedAt: '2026-05-19' }).success,
    ).toBe(false)
  })

  it('targetLabel が空文字なら reject', () => {
    expect(WaitingForStateSchema.safeParse({ ...baseInternal, targetLabel: '' }).success).toBe(
      false,
    )
  })
})
