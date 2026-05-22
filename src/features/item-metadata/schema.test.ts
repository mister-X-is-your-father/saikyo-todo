/**
 * iter1097 basics: `item-metadata/schema.ts` の zod schema test を追加。
 *
 * Item metadata 拡張 (FEEDBACK_QUEUE.md P0 entry 由来) の 5 schema (SetGoal /
 * Add/Remove IoArtifact / Add/Remove Stakeholder)。goal nullable + artifact
 * kind enum + label trim 必須 superRefine + 楽観ロック int を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  AddItemIoArtifactInputSchema,
  AddItemStakeholderInputSchema,
  ArtifactKindSchema,
  RemoveItemIoArtifactInputSchema,
  RemoveItemStakeholderInputSchema,
  SetItemGoalInputSchema,
} from './schema'

const UUID_A = '00000000-0000-4000-8000-000000000001'
const UUID_B = '00000000-0000-4000-8000-000000000002'

describe('ArtifactKindSchema', () => {
  it('2 つの enum (input/output) を accept', () => {
    expect(ArtifactKindSchema.parse('input')).toBe('input')
    expect(ArtifactKindSchema.parse('output')).toBe('output')
  })

  it('未知 kind を reject', () => {
    expect(() => ArtifactKindSchema.parse('artifact')).toThrow()
  })
})

describe('SetItemGoalInputSchema', () => {
  it('goal 文字列 を accept', () => {
    expect(() =>
      SetItemGoalInputSchema.parse({
        id: UUID_A,
        expectedVersion: 0,
        goal: 'チームに浸透させる',
      }),
    ).not.toThrow()
  })

  it('goal null で「削除」意図を accept', () => {
    expect(() =>
      SetItemGoalInputSchema.parse({ id: UUID_A, expectedVersion: 0, goal: null }),
    ).not.toThrow()
  })

  it('goal 2000 文字超過で reject', () => {
    expect(() =>
      SetItemGoalInputSchema.parse({
        id: UUID_A,
        expectedVersion: 0,
        goal: 'x'.repeat(2001),
      }),
    ).toThrow()
  })

  it('expectedVersion 負だと reject', () => {
    expect(() =>
      SetItemGoalInputSchema.parse({ id: UUID_A, expectedVersion: -1, goal: null }),
    ).toThrow()
  })
})

describe('AddItemIoArtifactInputSchema', () => {
  const baseValid = {
    itemId: UUID_A,
    kind: 'output' as const,
    label: '議事録 v1',
  }

  it('label のみ最小入力で accept (url/filePath/mime/description optional)', () => {
    expect(() => AddItemIoArtifactInputSchema.parse(baseValid)).not.toThrow()
  })

  it('label が空白のみだと superRefine で reject', () => {
    expect(() => AddItemIoArtifactInputSchema.parse({ ...baseValid, label: '   ' })).toThrow(
      /label/,
    )
  })

  it('label 200 文字超過で reject', () => {
    expect(() =>
      AddItemIoArtifactInputSchema.parse({ ...baseValid, label: 'x'.repeat(201) }),
    ).toThrow()
  })

  it('url が URL 形式でないと reject', () => {
    expect(() => AddItemIoArtifactInputSchema.parse({ ...baseValid, url: 'not-a-url' })).toThrow()
    // 正規 URL OK
    expect(() =>
      AddItemIoArtifactInputSchema.parse({ ...baseValid, url: 'https://example.com/doc' }),
    ).not.toThrow()
  })

  it('description 2000 文字超過で reject', () => {
    expect(() =>
      AddItemIoArtifactInputSchema.parse({
        ...baseValid,
        description: 'x'.repeat(2001),
      }),
    ).toThrow()
  })
})

describe('RemoveItemIoArtifactInputSchema', () => {
  it('id + expectedVersion 揃えば accept', () => {
    expect(RemoveItemIoArtifactInputSchema.parse({ id: UUID_A, expectedVersion: 1 })).toEqual({
      id: UUID_A,
      expectedVersion: 1,
    })
  })
})

describe('AddItemStakeholderInputSchema / RemoveItemStakeholderInputSchema', () => {
  it('Add は itemId + userId で accept', () => {
    expect(AddItemStakeholderInputSchema.parse({ itemId: UUID_A, userId: UUID_B })).toEqual({
      itemId: UUID_A,
      userId: UUID_B,
    })
  })

  it('Remove は itemId + userId で accept', () => {
    expect(RemoveItemStakeholderInputSchema.parse({ itemId: UUID_A, userId: UUID_B })).toEqual({
      itemId: UUID_A,
      userId: UUID_B,
    })
  })

  it('UUID 形式 NG で reject', () => {
    expect(() => AddItemStakeholderInputSchema.parse({ itemId: 'bad', userId: UUID_B })).toThrow()
  })
})
