import { describe, expect, it } from 'vitest'

import {
  CreateKeyResultInputSchema,
  type GoalStatus,
  goalStatusLabelJa,
  goalStatusSeverity,
  UpdateKeyResultInputSchema,
} from './schema'

describe('goalStatusLabelJa', () => {
  it('全 3 status の JA label を返す', () => {
    expect(goalStatusLabelJa('active')).toBe('稼働中')
    expect(goalStatusLabelJa('completed')).toBe('完了')
    expect(goalStatusLabelJa('archived')).toBe('アーカイブ')
  })

  it('全 GoalStatus 値が空文字列でない (網羅性ガード)', () => {
    const all: GoalStatus[] = ['active', 'completed', 'archived']
    for (const s of all) {
      expect(goalStatusLabelJa(s).length).toBeGreaterThan(0)
    }
  })
})

describe('goalStatusSeverity', () => {
  it('active → ok (緑、稼働中)', () => {
    expect(goalStatusSeverity('active')).toBe('ok')
  })

  it('completed → muted (グレー、過去)', () => {
    expect(goalStatusSeverity('completed')).toBe('muted')
  })

  it('archived → muted (グレー、より目立たない)', () => {
    expect(goalStatusSeverity('archived')).toBe('muted')
  })

  it('全 GoalStatus 値で 5 段階 Severity のいずれかを返す', () => {
    const all: GoalStatus[] = ['active', 'completed', 'archived']
    const validSev = ['ok', 'info', 'warn', 'danger', 'muted']
    for (const s of all) {
      expect(validSev).toContain(goalStatusSeverity(s))
    }
  })
})

// iter1146: KR weight/position の int 制約に付与した ja message 回帰防止
describe('CreateKeyResultInputSchema (iter1146 ja messages)', () => {
  const base = {
    goalId: '00000000-0000-4000-8000-000000000000',
    title: 'KR',
    idempotencyKey: '00000000-0000-4000-8000-000000000001',
  }

  it('weight 0 reject 時 ja message が出る', () => {
    const r = CreateKeyResultInputSchema.safeParse({ ...base, weight: 0 })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('weight は 1 以上'))).toBe(true)
    }
  })

  it('weight 11 reject 時 ja message が出る', () => {
    const r = CreateKeyResultInputSchema.safeParse({ ...base, weight: 11 })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('weight は 10 以下'))).toBe(true)
    }
  })

  it('position 負値 reject 時 ja message が出る', () => {
    const r = CreateKeyResultInputSchema.safeParse({ ...base, position: -1 })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('position は 0 以上'))).toBe(true)
    }
  })

  it('UpdateKeyResultInput でも同 ja message', () => {
    const r = UpdateKeyResultInputSchema.safeParse({
      id: base.goalId,
      expectedVersion: 0,
      patch: { weight: 99 },
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('weight は 10 以下'))).toBe(true)
    }
  })
})
