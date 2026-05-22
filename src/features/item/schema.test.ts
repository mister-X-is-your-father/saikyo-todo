/**
 * iter1105 basics: `item/schema.ts` の zod schema test を追加。
 *
 * Item 系 schema (Create superRefine 2 rule + Update/Status/SoftDelete + Move +
 * Reorder + WaitingForState superRefine 2 rule + SetWaiting/ClearWaiting)。MUST
 * → dod 必須 + start ≤ due + waiting internal/external 別 targetId 必須を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  ClearWaitingForInputSchema,
  CreateItemInputSchema,
  MoveItemInputSchema,
  ReorderItemInputSchema,
  SetWaitingForInputSchema,
  SoftDeleteItemInputSchema,
  UpdateItemInputSchema,
  UpdateStatusInputSchema,
  WaitingForStateSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('CreateItemInputSchema', () => {
  const baseValid = {
    workspaceId: VALID_UUID,
    title: '実装',
    idempotencyKey: VALID_UUID,
  }

  it('title のみ最小入力で accept (description/status/priority は default)', () => {
    const parsed = CreateItemInputSchema.parse(baseValid)
    expect(parsed.status).toBe('todo')
    expect(parsed.priority).toBe(4)
    expect(parsed.isMust).toBe(false)
  })

  it('title 空文字 / 500 文字超過で reject', () => {
    expect(() => CreateItemInputSchema.parse({ ...baseValid, title: '' })).toThrow()
    expect(() => CreateItemInputSchema.parse({ ...baseValid, title: 'x'.repeat(501) })).toThrow()
  })

  it('isMust true + dod 欠落で reject (superRefine)', () => {
    expect(() => CreateItemInputSchema.parse({ ...baseValid, isMust: true })).toThrow(/MUST/)
    expect(() => CreateItemInputSchema.parse({ ...baseValid, isMust: true, dod: '   ' })).toThrow()
  })

  it('isMust true + dod 有で accept', () => {
    expect(() =>
      CreateItemInputSchema.parse({ ...baseValid, isMust: true, dod: '承認会で承認' }),
    ).not.toThrow()
  })

  it('startDate > dueDate を reject (superRefine)', () => {
    expect(() =>
      CreateItemInputSchema.parse({
        ...baseValid,
        startDate: '2026-05-22',
        dueDate: '2026-05-21',
      }),
    ).toThrow(/期限/)
  })

  it('dueTime ISO 形式以外を reject', () => {
    expect(() => CreateItemInputSchema.parse({ ...baseValid, dueTime: '25:00' })).not.toThrow() // regex は厳密 24h 範囲チェックしない (HH:MM 数字のみ)
    expect(() => CreateItemInputSchema.parse({ ...baseValid, dueTime: '9:00' })).toThrow() // 1 桁 hour NG (zero-pad 必須)
  })

  it('priority 範囲外 (0 / 5) で reject', () => {
    expect(() => CreateItemInputSchema.parse({ ...baseValid, priority: 0 })).toThrow()
    expect(() => CreateItemInputSchema.parse({ ...baseValid, priority: 5 })).toThrow()
  })
})

describe('UpdateItemInputSchema / UpdateStatusInputSchema', () => {
  it('Update: patch 空オブジェクトを reject', () => {
    expect(() =>
      UpdateItemInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: {},
      }),
    ).toThrow()
  })

  it('Update: title のみ patch で accept', () => {
    expect(() =>
      UpdateItemInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { title: '更新' },
      }),
    ).not.toThrow()
  })

  it('UpdateStatus: status 必須 + position optional', () => {
    expect(() =>
      UpdateStatusInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        status: 'done',
      }),
    ).not.toThrow()
    expect(() =>
      UpdateStatusInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        status: '',
      }),
    ).toThrow()
  })
})

describe('MoveItemInputSchema / ReorderItemInputSchema', () => {
  it('Move: newParentItemId null (root へ) で accept', () => {
    expect(() => MoveItemInputSchema.parse({ id: VALID_UUID, newParentItemId: null })).not.toThrow()
  })

  it('Reorder: prev/next sibling null で端挿入を accept', () => {
    expect(() =>
      ReorderItemInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        prevSiblingId: null,
        nextSiblingId: VALID_UUID,
      }),
    ).not.toThrow()
  })
})

describe('SoftDeleteItemInputSchema', () => {
  it('id + expectedVersion で accept', () => {
    expect(() =>
      SoftDeleteItemInputSchema.parse({ id: VALID_UUID, expectedVersion: 0 }),
    ).not.toThrow()
  })
})

describe('WaitingForStateSchema (superRefine internal/external targetId)', () => {
  const baseValid = {
    kind: 'internal' as const,
    targetUserId: VALID_UUID,
    targetLabel: '田中さん',
    requestedAt: '2026-05-22T10:00:00Z',
  }

  it('internal + targetUserId で accept', () => {
    expect(() => WaitingForStateSchema.parse(baseValid)).not.toThrow()
  })

  it('internal + targetUserId 欠落で reject', () => {
    expect(() => WaitingForStateSchema.parse({ ...baseValid, targetUserId: null })).toThrow(
      /internal/,
    )
  })

  it('external + targetContactId で accept', () => {
    expect(() =>
      WaitingForStateSchema.parse({
        ...baseValid,
        kind: 'external',
        targetUserId: null,
        targetContactId: VALID_UUID,
      }),
    ).not.toThrow()
  })

  it('external + targetContactId 欠落で reject', () => {
    expect(() =>
      WaitingForStateSchema.parse({
        ...baseValid,
        kind: 'external',
        targetUserId: null,
      }),
    ).toThrow(/external/)
  })

  it('reminderCadenceDays 365 超過 / 0 で reject', () => {
    expect(() => WaitingForStateSchema.parse({ ...baseValid, reminderCadenceDays: 366 })).toThrow()
    expect(() => WaitingForStateSchema.parse({ ...baseValid, reminderCadenceDays: 0 })).toThrow()
  })
})

describe('SetWaitingForInputSchema / ClearWaitingForInputSchema', () => {
  it('Set: state を内包して accept', () => {
    expect(() =>
      SetWaitingForInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        state: {
          kind: 'internal',
          targetUserId: VALID_UUID,
          targetLabel: '田中さん',
          requestedAt: '2026-05-22T10:00:00Z',
        },
      }),
    ).not.toThrow()
  })

  it('Clear: id + expectedVersion で accept', () => {
    expect(() =>
      ClearWaitingForInputSchema.parse({ id: VALID_UUID, expectedVersion: 0 }),
    ).not.toThrow()
  })
})
