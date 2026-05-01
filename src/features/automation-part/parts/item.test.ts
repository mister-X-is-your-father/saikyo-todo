/**
 * iter587 ai-automation: item.update part の input schema 単体テスト。
 *
 * part.run() は itemService 経由で実 Supabase を叩くため、本 file は input
 * schema の validation のみを検証 (= service / repository は別 test で網羅済)。
 */
import { describe, expect, it } from 'vitest'

import { itemListPart, itemUpdatePart } from './item'

describe('itemUpdatePart input schema', () => {
  const validId = '01234567-89ab-4123-89ab-0123456789ab'

  it('最小: id + expectedVersion + 1 patch field で valid', () => {
    const r = itemUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: 0,
      patch: { title: 'new title' },
    })
    expect(r.success).toBe(true)
  })

  it('patch 空 object は invalid (= "更新する項目がありません")', () => {
    const r = itemUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: 1,
      patch: {},
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => /更新する項目/.test(i.message))).toBe(true)
    }
  })

  it('id が uuid でない → invalid', () => {
    const r = itemUpdatePart.input.safeParse({
      id: 'not-a-uuid',
      expectedVersion: 0,
      patch: { title: 't' },
    })
    expect(r.success).toBe(false)
  })

  it('expectedVersion 負数 → invalid (nonnegative)', () => {
    const r = itemUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: -1,
      patch: { title: 't' },
    })
    expect(r.success).toBe(false)
  })

  it('priority は 1-4 のみ許容', () => {
    const ok = itemUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: 0,
      patch: { priority: 2 },
    })
    expect(ok.success).toBe(true)

    const ng = itemUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: 0,
      patch: { priority: 5 },
    })
    expect(ng.success).toBe(false)
  })

  it('dueDate / scheduledFor / dod は null で clear 可能 (nullish)', () => {
    const r = itemUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: 0,
      patch: { dueDate: null, scheduledFor: null, dod: null },
    })
    expect(r.success).toBe(true)
  })

  it('part metadata: id / sideEffect / category', () => {
    expect(itemUpdatePart.id).toBe('item.update')
    expect(itemUpdatePart.sideEffect).toBe('write')
    expect(itemUpdatePart.category).toBe('item')
  })
})

describe('itemListPart input schema', () => {
  it('空 object で valid (filter 無し = 全件)', () => {
    const r = itemListPart.input.safeParse({})
    expect(r.success).toBe(true)
  })

  it('status filter 単独で valid', () => {
    const r = itemListPart.input.safeParse({ status: 'todo' })
    expect(r.success).toBe(true)
  })

  it('isMust filter 単独で valid', () => {
    const r = itemListPart.input.safeParse({ isMust: true })
    expect(r.success).toBe(true)
  })

  it('status + isMust 同時指定で valid', () => {
    const r = itemListPart.input.safeParse({ status: 'in_progress', isMust: true })
    expect(r.success).toBe(true)
  })

  it('status が空文字 → invalid (min 1)', () => {
    const r = itemListPart.input.safeParse({ status: '' })
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect = read / category', () => {
    expect(itemListPart.id).toBe('item.list')
    expect(itemListPart.sideEffect).toBe('read')
    expect(itemListPart.category).toBe('item')
  })
})
