/**
 * iter1085 basics: `categories.ts` の pure helper test を追加。
 *
 * 稼働カテゴリ (dev/meeting/research/ops/other) は saikyo-todo / mock-timesheet
 * の両方で共有される **invariant set**。helper が key→label 変換 + 未知 key の
 * passthrough を正しく扱うことを回帰防止。zod schema は invalid key を弾くこと
 * も assert (consumer 側の `parse` で safety net)。
 */
import { describe, expect, it } from 'vitest'

import { categoryLabel, TIME_ENTRY_CATEGORIES, TimeEntryCategorySchema } from './categories'

describe('TIME_ENTRY_CATEGORIES (invariant)', () => {
  it('5 件の固定カテゴリを持つ', () => {
    expect(TIME_ENTRY_CATEGORIES).toHaveLength(5)
  })

  it('全 key が unique', () => {
    const keys = TIME_ENTRY_CATEGORIES.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('全 label が non-empty', () => {
    for (const c of TIME_ENTRY_CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0)
    }
  })
})

describe('categoryLabel', () => {
  it('既知 key の label を返す', () => {
    expect(categoryLabel('dev')).toBe('開発')
    expect(categoryLabel('meeting')).toBe('MTG')
    expect(categoryLabel('research')).toBe('調査')
    expect(categoryLabel('ops')).toBe('運用')
    expect(categoryLabel('other')).toBe('その他')
  })

  it('未知 key はそのまま返す (passthrough、UI 落ちを防ぐ defensive)', () => {
    expect(categoryLabel('unknown-key')).toBe('unknown-key')
    expect(categoryLabel('')).toBe('')
  })
})

describe('TimeEntryCategorySchema', () => {
  it('既知 key を accept', () => {
    expect(TimeEntryCategorySchema.parse('dev')).toBe('dev')
    expect(TimeEntryCategorySchema.parse('meeting')).toBe('meeting')
    expect(TimeEntryCategorySchema.parse('other')).toBe('other')
  })

  it('未知 key は zod error', () => {
    expect(() => TimeEntryCategorySchema.parse('invalid')).toThrow()
    expect(() => TimeEntryCategorySchema.parse('')).toThrow()
    expect(() => TimeEntryCategorySchema.parse(123)).toThrow()
  })
})
